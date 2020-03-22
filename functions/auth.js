const functions = require('firebase-functions');
const request = require('request');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');

const api_key = "AIzaSyD7n8fuD2SJfiYi61fY7pY7abhpJeNC8ac";

const signInWithIdentityToolkit = (res, api_key, email, password) => {
  request.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + api_key +'&email=' + email + '&password=' + password + '&returnSecureToken=true',
               function (error, response, body) {
    if (response.statusCode !== 200) {
      utils.handleBadRequest(res, "Invalid email or password.");

    } else {
      let bodyAsJson = JSON.parse(body);
      let data = {};

      data["idToken"] = bodyAsJson["idToken"];

      let docRef = fb.db.collection("users").where("email", "==", email).limit(1);
      docRef.get().then(querySnapshot => {
        let doc = querySnapshot.docs[0];
        let docData = doc._fieldsProto;
        data["username"] = docData["username"]["stringValue"];
        data["is_student"] = docData["is_student"]["booleanValue"];

        utils.handleSuccess(res, data);

      }).catch(err => {
        utils.handleServerError(res, err);
      });
    }
  });
}

const createUserJson = (is_student=null, email=null, username=null, profileRef=null, postings=[]) => {
	var userDoc = {};

	if (profileRef !== null) {
		userDoc[CONSTS.PROFREF] = profileRef;
	}
	if (typeof is_student === 'boolean') {
		userDoc[CONSTS.IS_STUDENT] = is_student;
	}
	if (typeof email === 'string') {
		userDoc[CONSTS.EMAIL] = email;
	}
	if (typeof username === 'string') {
		userDoc[CONSTS.USERNAME] = username;
	}
	if (Array.isArray(postings)) {
		userDoc[CONSTS.POSTINGS] = postings;
	}
	if (typeof username === 'string') {
		userDoc[CONSTS.USERNAME] = username;
	}

	return userDoc;
}

exports.signIn = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    utils.handleBadRequest(res, 'Must be a POST request.');
    return;
  }

  if (!(CONSTS.EMAIL in req.body && CONSTS.PASSWORD in req.body)) {
    utils.handleBadRequest(res, "Missing email or password.");
    return;
  }

  signInWithIdentityToolkit(res, api_key, req.body.email, req.body.password);
});

exports.signUp = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    utils.handleBadRequest(res, 'Must be a POST request.');
    return;
  }

  if (!(CONSTS.EMAIL in req.body && CONSTS.PASSWORD in req.body && CONSTS.IS_STUDENT in req.body && CONSTS.USERNAME in req.body)) {
    utils.handleBadRequest(res, "Missing required fields.");
    return;
  }

  let email = req.body.email;
  let password = req.body.password;
  let username = req.body.username;

  // See the UserRecord reference doc for the contents of userRecord.
  let docRef = fb.db.collection("users").where("username", "==", username).limit(1);
  // checking if user exists
  docRef.get().then(querySnapshot => {
      if (!querySnapshot.empty) {
        // overwriting existing user not allowed
        utils.handleBadRequest(res, "User already exists.");
      }
  }).catch(err => {
  	utils.handleServerError(res, err);
  });

  console.log("Creating new user.");

  fb.admin.auth().createUser({
    email, password
  }).then(userRecord => {
    let uid = userRecord.uid;
    let userDocRef = fb.db.collection("users").doc(uid);
    let profileDocRef = fb.db.collection("profiles").doc(uid);

    let userJson = createUserJson(
      req.body[CONSTS.IS_STUDENT],
      req.body[CONSTS.EMAIL],
      req.body[CONSTS.USERNAME],
      profileDocRef,
      []
    );

    // blank profile
    let profileJson;
    if (req.body[CONSTS.IS_STUDENT]) {
      profileJson = {
        [CONSTS.USERREF]: userDocRef,
        [CONSTS.NAME]: "",
        [CONSTS.ABOUT_ME]: "",
        [CONSTS.GPA]: -1,
        [CONSTS.MAJOR]: "",
        [CONSTS.YEAR]: -1,
        [CONSTS.COURSES]: null,
        [CONSTS.INTERESTS]: null,
        [CONSTS.EXP]: null,
      };
    } else {
      profileJson = {
        [CONSTS.USERREF]: userDocRef,
        [CONSTS.NAME]: "",
        [CONSTS.ABOUT_ME]: "",
        [CONSTS.COURSES]: null,
        [CONSTS.INTERESTS]: null,
      }
    }

    userDocRef.set(userJson).then(() => {
      profileDocRef.set(profileJson).then(() => {
        console.log("Signing in after signing up.");
        signInWithIdentityToolkit(res, api_key, email, password);

      }).catch(err => {
        userDocRef.delete();
        utils.handleServerError(res, err);
      });
    }).catch(err => {
      utils.handleServerError(res, err);
    });
    
  }).catch(err => {
    utils.handleServerError(res, err);
  });
});
