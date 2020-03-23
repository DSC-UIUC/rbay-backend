const functions = require('firebase-functions');
const axios = require('axios');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');

const api_key = "AIzaSyD7n8fuD2SJfiYi61fY7pY7abhpJeNC8ac";

const signInWithIdentityToolkit = async (res, api_key, email, password) => {
  let params = {
    key: api_key,
    email,
    password,
    returnSecureToken: true
  };

  try {
    let response = await axios.post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword", null, { params });

    console.log(response);

    if (response.status !== 200) {
      utils.handleBadRequest(res, "Invalid email or password.");
      return;
    }

    let data = {};
    data["idToken"] = response.data["idToken"];

    let docRef = fb.db.collection("users").where("email", "==", email).limit(1);
    let querySnapshot = await docRef.get();
    let doc = querySnapshot.docs[0];
    let docData = doc._fieldsProto;

    data["username"] = docData["username"]["stringValue"];
    data["is_student"] = docData["is_student"]["booleanValue"];

    utils.handleSuccess(res, data);
  } catch (err) {
    utils.handleServerError(res, err);
  }

  // request.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + api_key +'&email=' + email + '&password=' + password + '&returnSecureToken=true',
  //              function (error, response, body) {
  //   if (response.statusCode !== 200) {
  //     utils.handleBadRequest(res, "Invalid email or password.");
  //
  //   } else {
  //     let bodyAsJson = JSON.parse(body);
  //     let data = {};
  //
  //     data["idToken"] = bodyAsJson["idToken"];
  //
  //     let docRef = fb.db.collection("users").where("email", "==", email).limit(1);
  //     docRef.get().then(querySnapshot => {
  //       let doc = querySnapshot.docs[0];
  //       let docData = doc._fieldsProto;
  //
  //       data["username"] = docData["username"]["stringValue"];
  //       data["is_student"] = docData["is_student"]["booleanValue"];
  //
  //       utils.handleSuccess(res, data);
  //
  //     }).catch(err => {
  //       utils.handleServerError(res, err);
  //     });
  //   }
  // });
}

const createUserJson = (is_student=null, email=null, username=null, profileDocRef) => {
	var userDoc = {};

	if (typeof is_student === 'boolean') {
		userDoc[CONSTS.IS_STUDENT] = is_student;
	}
	if (typeof email === 'string') {
		userDoc[CONSTS.EMAIL] = email;
	}
	if (typeof username === 'string') {
		userDoc[CONSTS.USERNAME] = username;
	}

  userDoc[CONSTS.PROFREF] = profileDocRef;
	userDoc[CONSTS.POSTINGS] = [];
	return userDoc;
}

const verifyTokenWithAdmin = async (idToken) => {
  try {
    let decodedToken = await fb.admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (err) {
    return null;
  }
}

exports.signIn = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method === "OPTIONS") {
    res.end();
    return;
  }

  if (req.method !== "POST") {
    utils.handleBadRequest(res, 'Must be a POST request.');
    return;
  }

  if (!(req.body.hasOwnProperty(CONSTS.EMAIL) && req.body.hasOwnProperty(CONSTS.PASSWORD))) {
    utils.handleBadRequest(res, "Missing email or password.");
    return;
  }

  signInWithIdentityToolkit(res, api_key, req.body.email, req.body.password);
});

exports.signUp = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method === "OPTIONS") {
    res.end();
    return;
  }

  if (req.method !== "POST") {
    utils.handleBadRequest(res, 'Must be a POST request.');
    return;
  }

  if (!(req.body.hasOwnProperty(CONSTS.EMAIL)
      && req.body.hasOwnProperty(CONSTS.PASSWORD)
      && req.body.hasOwnProperty(CONSTS.IS_STUDENT)
      && req.body.hasOwnProperty(CONSTS.USERNAME))) {
    utils.handleBadRequest(res, "Missing required fields.");
    return;
  }

  let email = req.body.email;
  let password = req.body.password;
  let username = req.body.username;

  try {
    let docRef = fb.db.collection("users").where("username", "==", username).limit(1);
    let querySnapshot = await docRef.get();
    if (!querySnapshot.empty) {
      // overwriting existing user not allowed
      utils.handleBadRequest(res, "User already exists.");
      return;
    }

    let userRecord = await fb.admin.auth().createUser({ email, password });
    console.log("Created new user.");

    let uid = userRecord.uid;
    let userDocRef = fb.db.collection("users").doc(uid);
    let profileDocRef = fb.db.collection("profiles").doc(uid);

    let userJson = createUserJson(
      req.body[CONSTS.IS_STUDENT],
      req.body[CONSTS.EMAIL],
      req.body[CONSTS.USERNAME],
      profileDocRef,
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

    await userDocRef.set(userJson);
    console.log("User document set.");
    await profileDocRef.set(profileJson);
    console.log("Profile document set.");

    console.log("Signing in after signing up.");
    signInWithIdentityToolkit(res, api_key, email, password);

  } catch (err) {
    utils.handleServerError(res, err);
  }

  // // See the UserRecord reference doc for the contents of userRecord.
  // let docRef = fb.db.collection("users").where("username", "==", username).limit(1);
  // // checking if user exists
  // docRef.get().then(querySnapshot => {
  //   if (!querySnapshot.empty) {
  //     // overwriting existing user not allowed
  //     utils.handleBadRequest(res, "User already exists.");
  //     return;
  //   }
  //
  //   fb.admin.auth().createUser({
  //     email, password
  //   }).then(userRecord => {
  //
  //     console.log("Created new user.");
  //     let uid = userRecord.uid;
  //     let userDocRef = fb.db.collection("users").doc(uid);
  //     let profileDocRef = fb.db.collection("profiles").doc(uid);
  //
  //     let userJson = createUserJson(
  //       req.body[CONSTS.IS_STUDENT],
  //       req.body[CONSTS.EMAIL],
  //       req.body[CONSTS.USERNAME],
  //       profileDocRef,
  //     );
  //
  //     // blank profile
  //     let profileJson;
  //     if (req.body[CONSTS.IS_STUDENT]) {
  //       profileJson = {
  //         [CONSTS.USERREF]: userDocRef,
  //         [CONSTS.NAME]: "",
  //         [CONSTS.ABOUT_ME]: "",
  //         [CONSTS.GPA]: -1,
  //         [CONSTS.MAJOR]: "",
  //         [CONSTS.YEAR]: -1,
  //         [CONSTS.COURSES]: null,
  //         [CONSTS.INTERESTS]: null,
  //         [CONSTS.EXP]: null,
  //       };
  //     } else {
  //       profileJson = {
  //         [CONSTS.USERREF]: userDocRef,
  //         [CONSTS.NAME]: "",
  //         [CONSTS.ABOUT_ME]: "",
  //         [CONSTS.COURSES]: null,
  //         [CONSTS.INTERESTS]: null,
  //       }
  //     }
  //
  //     userDocRef.set(userJson).then(() => {
  //       console.log("User document set.");
  //
  //       profileDocRef.set(profileJson).then(() => {
  //         console.log("Profile document set.");
  //         console.log("Signing in after signing up.");
  //         signInWithIdentityToolkit(res, api_key, email, password);
  //
  //       }).catch(err => {
  //         userDocRef.delete();
  //         utils.handleServerError(res, err);
  //       });
  //     }).catch(err => {
  //       utils.handleServerError(res, err);
  //     });
  //   }).catch(err => {
  //     utils.handleServerError(res, err);
  //   });
  // }).catch(err => {
  // 	utils.handleServerError(res, err);
  // });
});

exports.verifyTokenWithAdmin = verifyTokenWithAdmin;

exports.checkToken = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method !== "GET") {
    utils.handleBadRequest(res, "Must be a GET request.");
    return;
  }

  if (!req.query.hasOwnProperty("idToken")) {
    utils.handleBadRequest(res, "Missing idToken to verify.");
    return;
  }

  let idToken = req.query.idToken;
  let decodedUid = await verifyTokenWithAdmin(idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    utils.handleBadRequest(res, "Token is invalid or expired.");
  } else {
    utils.handleSuccess(res, { idToken });
  }
});
