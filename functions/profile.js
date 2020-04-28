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
    let userData = userDoc.data();
    if (!userDoc.exists) {
      return utils.handleServerError(res, "User does not exist.");
    }

    let profileDocRef = userData.profile;
    let verifiedData = utils.verifyFieldsProfile(userData[CONSTS.IS_STUDENT], req.body);

    await profileDocRef.set(verifiedData, { merge: true });

    // changing name in posting data if prof
    if (!userData[CONSTS.IS_STUDENT] && CONSTS.NAME in verifiedData) {
      for (postRef of userData[CONSTS.POSTINGS]) {
        await postRef.set({ [CONSTS.NAME] : verifiedData[CONSTS.NAME]}, {merge: true});
      }
    }

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

  if (!req.body.hasOwnProperty("idToken") || !req.body.hasOwnProperty("type") || !req.body.hasOwnProperty("contentType") || !req.body.hasOwnProperty("name")) {
    return utils.handleBadRequest(res, "Missing required fields.");
  }

  let fileType = req.body.type;
  let idToken = req.body.idToken;
  let fileName = req.body.name;
  let decodedUid = await auth.verifyTokenWithAdmin(idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  if (fileType !== "resume" && fileType !== "picture") {
    return utils.handleBadRequest(res, "Invalid file type.");
  }

  let filePath = fileType + "/" + decodedUid + "_" + fileName;
  const bucket = fb.storage.bucket("research-bay.appspot.com");
  const file = bucket.file(filePath);
  bucket.setCorsConfiguration([
    {
      "maxAgeSeconds": 3600,
      "method": ["*"],
      "origin": ["*"],
      "responseHeader": ["*"]
    }
  ]);

  const expiresAtMs = Date.now() + 300000; // Link expires in 5 minutes
  const config = {
    action: 'write',
    expires: expiresAtMs,
    contentType: req.body.contentType,
    version: "v4",
  };

  try {
    let url = await file.getSignedUrl(config);
    return utils.handleSuccess(res, url);
  } catch (err) {
    return utils.handleServerError(res, err);
  }
});

exports.setProfileFile = functions.storage.object().onFinalize(async (object) => {
  let filePath = object.name;
  if (!filePath.startsWith("resume/") && !filePath.startsWith("picture/")) {
    console.log("Invalid file category.");
    return;
  }

  try {
    let filePathContents = filePath.split("/");
    let fileType = filePathContents[0];
    let fileName = filePathContents[1];

    let fileNameContents = fileName.split("_");
    let ownerUid = fileNameContents[0];

    const bucket = fb.storage.bucket(object.bucket);
    bucket.setCorsConfiguration([
      {
        "maxAgeSeconds": 3600,
        "method": ["*"],
        "origin": ["*"],
        "responseHeader": ["*"]
      }
    ]);

    const file = bucket.file(filePath);
    let metadata = {
      metadata: {
        "firebaseStorageDownloadTokens": ownerUid,
      }
    };

    await file.setMetadata(metadata);

    let token = ownerUid;
    let downloadUrl = "https://firebasestorage.googleapis.com/v0/b/" + object.bucket + "/o/" + encodeURIComponent(filePath) + "?alt=media&token=" + token;
    console.log(filePath, downloadUrl);

    let profileDocRef = fb.db.collection("profiles").doc(ownerUid);
    let profileDoc = await profileDocRef.get();
    if (!profileDoc.exists) {
      console.log("User profile does not exist.");
      return;
    }

    await profileDocRef.set({ [fileType]: downloadUrl }, { merge: true });

  } catch (err) {
    console.log(err);
    return;
  }
});
