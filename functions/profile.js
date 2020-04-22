const functions = require('firebase-functions');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');

const getProfileById = async (uid, res) => {
  try {
    let userDocRef = fb.db.collection("users").doc(uid);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return utils.handleServerError(res, "User does not exist.");
    }

    let profileDocRef = userDoc.data().profile;
    let profileDoc = await profileDocRef.get();
    if (!profileDoc.exists) {
      return utils.handleServerError(res, "Profile does not exist.");
    }

    let data = profileDoc.data();
    let { user, ...rest } = data;

    return utils.handleSuccess(res, rest);
  } catch (err) {
    return utils.handleServerError(res, err);
  }
}

exports.getProfileById = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method !== "GET") {
    return utils.handleBadRequest(res, "Must be a GET request.");
  }

  if (!req.query.hasOwnProperty("uid")) {
    return utils.handleBadRequest(res, "Missing uid.");
  }

  let uid = req.query.uid;
  console.log(uid);
  getProfileById(uid, res);
});

exports.getProfile = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method !== "GET") {
    return utils.handleBadRequest(res, "Must be a GET request.");
  }

  if (!req.query.hasOwnProperty("idToken")) {
    return utils.handleBadRequest(res, "Missing idToken.");
  }

  let idToken = req.query.idToken;
  let decodedUid = await auth.verifyTokenWithAdmin(idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  getProfileById(decodedUid, res);
});

// idtoken needs to be in body
exports.setProfile = functions.https.onRequest(async (req, res) => {
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

  if (!req.body.hasOwnProperty("idToken")) {
    return utils.handleBadRequest(res, "Missing idToken.");
  }

  let { idToken, ...newProfileData } = req.body;
  let decodedUid = await auth.verifyTokenWithAdmin(idToken);
  console.log(decodedUid);
  console.log(newProfileData);
  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  try {
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return utils.handleServerError(res, "User does not exist.");
    }

    let profileDocRef = userDoc.data().profile;
    let verifiedData = utils.verifyFieldsProfile(userDoc.data().is_student, req.body);

    await profileDocRef.set(verifiedData, { merge: true });
    let profileDoc = await profileDocRef.get();

    let { user, ...rest } = profileDoc.data();

    return utils.handleSuccess(res, rest);
  } catch (err) {
    return utils.handleServerError(res, err);
  }

});

exports.getProfileFileSignedUrl = functions.https.onRequest(async (req, res) => {
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

  if (!req.query.hasOwnProperty("idToken")) {
    return utils.handleBadRequest(res, "Missing idToken.");
  }

  if (!req.query.hasOwnProperty("type")) {
    return utils.handleBadRequest(res, "Missing file type.");
  }

  let fileType = req.body.type;
  let idToken = req.body.idToken;
  let decodedUid = await auth.verifyTokenWithAdmin(idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  if (fileType !== "resume" && fileType !== "picture") {
    return utils.handleBadRequest(res, "Invalid file type.");
  }

  const file = fb.storage.bucket(fileType).file(decodedUid);

  const expiresAtMs = Date.now() + 300000; // Link expires in 5 minutes
  const config = {
    action: 'write',
    expires: expiresAtMs,
    contentType: req.body.contentType,
  };

  file.getSignedUrl(config, (err, url) => {
    if (err) {
      return utils.handleServerError(res, err);
    }

    return utils.handleSuccess(res, url);
  });
});

exports.setProfileFile = functions.storage.object().onFinalize(async (object) => {
  let filePath = object.name; // filepath of object
  console.log(object);
  console.log(filePath);
  console.log(typeof filePath);
});
