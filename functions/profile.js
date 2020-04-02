const functions = require('firebase-functions');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');

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

  try {
    let userDocRef = fb.db.collection("users").doc(decodedUid);
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
  // console.log(decodedUid);
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
