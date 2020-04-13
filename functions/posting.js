const functions = require('firebase-functions');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');

const getUserPostingsWithRef = async (postingsRefArray) => {
  let data = [];

  try {
    for (let postingRef of postingsRefArray) {
      let postingDoc = await postingRef.get();
      if (postingDoc.exists) {
        let { professor, ...postData } = postingDoc.data();
        data.push(postData);
      }
    }

    return data;
  } catch (err) {
    console.log(err);
    return data;
  }
}

exports.getUserPostings = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method !== "GET") {
    utils.handleBadRequest(res, "Must be a GET request.");
    return;
  }

  if (!req.query.hasOwnProperty("idToken")) {
    utils.handleBadRequest(res, "Missing idToken.");
    return;
  }

  let idToken = req.query.idToken;
  let decodedUid = await auth.verifyTokenWithAdmin(idToken);
  console.log(decodedUid);
  if (decodedUid == null) {
    utils.handleBadRequest(res, "Token is invalid or expired.");
    return;
  }

  try {
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      utils.handleServerError(res, "User does not exist.");
      return;
    }

    let postingsRefArray = userDoc.data().postings;
    let data = await getUserPostingsWithRef(postingsRefArray);

    utils.handleSuccess(res, data);
  } catch (err) {
    utils.handleServerError(res, err);
  }
});


exports.selectApplicantForPosting = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  if (req.method !== "POST") {
    return utils.handleBadRequest(res, "Must be a POST request.");
  }

  if (!(req.body.hasOwnProperty("idToken") && req.body.hasOwnProperty("postingId"))) {
    return utils.handleBadRequest(res, "Missing idToken or postingId.");
  }

  let postingId = req.body.postingId;
  let idToken = req.body.idToken;
  let decodedUid = await auth.verifyTokenWithAdmin(idToken);

  if (decodedUid == null) {
    return utils.handleBadRequest(res, "Token is invalid or expired.");
  }

  try {
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    let userDocData = await userDoc.data();

    if (!userDoc.exists) {
      utils.handleServerError(res, "User does not exist.");
      return;
    }

    // only allowing professors to select applicants
    if (userDocData[CONSTS.IS_STUDENT]) {
      utils.handleBadRequest(res, "Only professors can select applicants.");
      return;
    }

    // checking to see if posting is in professors posting list
    if (!(postingId in userDocData[CONSTS.POSTINGS])) {
      utils.handleBadRequest(res, "Given professor did not create given posting");
      return;
    }

    // checking to see if posting is still open



  } catch(err) {
    utils.handleServerError(res, err);
  }
});



exports.getUserRecommendations = functions.https.onRequest(async (req, res) => {
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

  // TODO
  return utils.handleSuccess(res, []);
});
