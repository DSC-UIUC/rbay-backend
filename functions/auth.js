const functions = require('firebase-functions');
const axios = require('axios');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const FieldValue = require('firebase-admin').firestore.FieldValue;
const api_key = functions.config().api.key;


const signInWithIdentityToolkit = async (res, api_key, email, password) => {
  let params = {
    key: api_key,
    email,
    password,
    returnSecureToken: true
  };

  try {
    let response = await axios.post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword", null, { params });

    if (response.status !== 200) {
      return utils.handleBadRequest(res, "Invalid email or password.");
    }

    let data = {};
    data.idToken = response.data["idToken"];
    data.expirationTimestamp = parseInt(response.data["expiresIn"]) + Math.round(Date.now() / 1000);

    let docRef = fb.db.collection("users").where("email", "==", email).limit(1);
    let querySnapshot = await docRef.get();
    let docData= querySnapshot.docs[0].data();

    data.username = docData.username;
    data.is_student = docData.is_student;
    data.email = docData.email;

    return utils.handleSuccess(res, data);
  } catch (err) {
    if (err.isAxiosError) {
      return utils.handleBadRequest(res, "Invalid email or password");
    } else {
      return utils.handleServerError(res, err);
    }
  }
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

const verifyTokenWithAdmin = exports.verifyTokenWithAdmin = async (idToken) => {
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
    return res.end();
  }

  if (req.method !== "POST") {
    return utils.handleBadRequest(res, 'Must be a POST request.');
  }

  if (!(req.body.hasOwnProperty(CONSTS.EMAIL) && req.body.hasOwnProperty(CONSTS.PASSWORD))) {
    return utils.handleBadRequest(res, "Missing email or password.");
  }

  await signInWithIdentityToolkit(res, api_key, req.body.email, req.body.password);
});

exports.signUp = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method === "OPTIONS") {
    return res.end();
  }

  if (req.method !== "POST") {
    return utils.handleBadRequest(res, 'Must be a POST request.');
  }

  if (!(req.body.hasOwnProperty(CONSTS.EMAIL)
      && req.body.hasOwnProperty(CONSTS.PASSWORD)
      && req.body.hasOwnProperty(CONSTS.IS_STUDENT)
      && req.body.hasOwnProperty(CONSTS.USERNAME))) {
    return utils.handleBadRequest(res, "Missing required fields: email, password, is_student, or username");
  }

  let email = req.body[CONSTS.EMAIL];
  let password = req.body[CONSTS.PASSWORD];
  let username = req.body[CONSTS.USERNAME];
  let is_student = req.body[CONSTS.IS_STUDENT];

  if (typeof email !== "string"
      || typeof password !== "string"
      || typeof username !== "string"
      || typeof is_student !== "boolean") {
    return utils.handleBadRequest(res, "A given parameter has incorrect data type");
  }

  try {
    let docRef = fb.db.collection("users").where("username", "==", username).limit(1);
    let querySnapshot = await docRef.get();
    if (!querySnapshot.empty) {
      // overwriting existing user not allowed
      return utils.handleBadRequest(res, "User already exists.");
    }

    let userRecord = await fb.admin.auth().createUser({ email, password });
    console.log("Created new user.");

    let uid = userRecord.uid;
    let userDocRef = fb.db.collection("users").doc(uid);
    let profileDocRef = fb.db.collection("profiles").doc(uid);

    let userJson = createUserJson(
      is_student,
      email,
      username,
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
        [CONSTS.COURSES]: [],
        [CONSTS.INTERESTS]: [],
        [CONSTS.EXP]: [],
        [CONSTS.PIC]: "",
        [CONSTS.SKILLS]: [],
        [CONSTS.WEBSITE]: ""
      };
    } else {
      profileJson = {
        [CONSTS.USERREF]: userDocRef,
        [CONSTS.NAME]: "",
        [CONSTS.ABOUT_ME]: "",
        [CONSTS.INTERESTS]: [],
        [CONSTS.DEPT]: "",
        [CONSTS.PIC]: "",
        [CONSTS.WEBSITE]: ""
      }
    }

    await userDocRef.set(userJson);
    console.log("User document set.");
    await profileDocRef.set(profileJson);
    console.log("Profile document set.");

    console.log("Signing in after signing up.");
    await signInWithIdentityToolkit(res, api_key, email, password);
  } catch (err) {
    utils.handleServerError(res, err);
  }
});

exports.checkToken = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method !== "GET") {
    return utils.handleBadRequest(res, "Must be a GET request.");
  }

  if (!req.query.hasOwnProperty("idToken")) {
    return utils.handleBadRequest(res, "Missing idToken to verify.");
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

exports.changePassword = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method === "OPTIONS") {
    return res.end();
  }

  if (req.method !== "POST") {
    return utils.handleBadRequest(res, 'Must be a POST request.');
  }

  if (!(req.body.hasOwnProperty("idToken") && req.body.hasOwnProperty("password"))) {
    return utils.handleBadRequest(res, "Missing idToken or new password");
  }

  let decodedUid = await verifyTokenWithAdmin(req.body.idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  try {
    let result = await fb.admin.auth().updateUser(decodedUid, {
      password: req.body.password,
    });

    console.log("Updated password for user.");  // TODO test
    return utils.handleSuccess(res, "Password updated");

  } catch (err) {
    return utils.handleServerError(res, err);
  }
});

exports.deleteUser = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS, DELETE');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method === "OPTIONS") {
    return res.end();
  }

  if (req.method !== "DELETE") {
    return utils.handleBadRequest(res, 'Must be a DELETE request.');
  }

  if (!(req.query.hasOwnProperty("idToken"))) {
    return utils.handleBadRequest(res, "Missing idToken in query.");
  }

  let decodedUid = await verifyTokenWithAdmin(req.query.idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  try {
      let result = await fb.admin.auth().deleteUser(decodedUid);

      let userDocRef = fb.db.collection("users").doc(decodedUid);
      let userDoc = await userDocRef.get();
      let profileDocRef = userDoc.data().profile;
      let postings = await userDoc.data().postings;
      if (!(await userDoc.data().is_student)) {
          for (let i = 0; i < postings.length; i++) {
              await utils.deletePostingAndReferences(postings[i], decodedUid);
          }
      } else {
          for (let i = 0; i < postings.length; i++) {
              postings[i].update({ [CONSTS.APPLICANTS]: FieldValue.arrayRemove({ [CONSTS.ID]: decodedUid, [CONSTS.IS_SELECTED]: false }) });
              postings[i].update({ [CONSTS.APPLICANTS]: FieldValue.arrayRemove({ [CONSTS.ID]: decodedUid, [CONSTS.IS_SELECTED]: true }) });
          }
      }

    userDocRef.delete();
    profileDocRef.delete();

    console.log("Deleted user.");
    return utils.handleSuccess(res, result);

  } catch (err) {
    return utils.handleServerError(res, err);
  }

});
