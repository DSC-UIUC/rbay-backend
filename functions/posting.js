const functions = require('firebase-functions');
const firestore = require('firestore')
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');
const FieldValue = require('firebase-admin').firestore.FieldValue;

const getUserPostingsWithRef = async (postingsRefArray) => {
  let data = [];

  try {
    for (let postingRef of postingsRefArray) {
      let postingDoc = await postingRef.get();
      if (postingDoc.exists) {
        data.push(postingDoc.data());
      }
    }

    return data;
  } catch (err) {
    console.log(err);
    return data;
  }
}

exports.updatePosting = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    // Validity checking.
    if (req.method !== "POST") {
        utils.handleBadRequest(res, "Must be a POST request.");
        return;
    }

    if (!req.query.hasOwnProperty("idToken") || !req.query.hasOwnProperty("postingId")) {
        utils.handleBadRequest(res, "Missing idToken or postingId.");
        return;
    }

    if (!req.body.hasOwnProperty(CONSTS.DESCRIPTION) ||
        !req.body.hasOwnProperty(CONSTS.LAB_NAME) ||
        !req.body.hasOwnProperty(CONSTS.TITLE) ||
        !req.body.hasOwnProperty(CONSTS.TAGS)) {
        utils.handleBadRequest(res, "Missing title, lab name, or description, or tags.");
        return;
    }

    let idToken = req.query.idToken;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
        utils.handleBadRequest(res, "Token is invalid or expired.");
        return;
    }

    // Find user updating posting.
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        utils.handleServerError(res, "User does not exist.");
        return;
    }

    // Find document to be updated.
    let postingDocRef = fb.db.collection("postings").doc(req.query["postingId"]);
    let postingDoc = await postingDocRef.get();
    let postingProfRefValue = postingDoc["_fieldsProto"][CONSTS.PROFESSOR]["referenceValue"]
    let linkedProfessorDocRef = fb.db.collection("users").doc(postingProfRefValue);

    // Check to make sure user is correct.
    if (linkedProfessorDocRef.id !== userDocRef.id) {
        utils.handleBadRequest(res, "Only the original poster can only modify their postings.");
        return;
    }

    // Constructing posting document.
    let postingJson = {
        [CONSTS.TITLE]: req.body[CONSTS.TITLE],
        [CONSTS.LAB_NAME]: req.body[CONSTS.LAB_NAME],
        [CONSTS.PROFESSOR]: userDocRef,
        [CONSTS.DESCRIPTION]: req.body[CONSTS.DESCRIPTION],
        [CONSTS.TAGS]: req.body[CONSTS.TAGS]
    }

    let requirements = {};
    if (req.body.hasOwnProperty(CONSTS.REQUIREMENTS)) {
        requirements = req.body[CONSTS.REQUIREMENTS];
    }

    // Updating posting document.
    postingJson[CONSTS.REQUIREMENTS] = requirements;
    postingDocRef.set(postingJson);
    utils.handleSuccess(res, { "id": postingDocRef.id })
    return;
});

exports.getPostingById = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    if (req.method !== "GET") {
        return utils.handleBadRequest(res, 'Must be a GET request.');
    }

    if (!req.query.hasOwnProperty("idToken") || !req.query.hasOwnProperty("postingId")) {
        utils.handleBadRequest(res, "Missing idToken or postingId.");
        return;
    }

    let idToken = req.query.idToken;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
        utils.handleBadRequest(res, "Token is invalid or expired.");
        return;
    }

    let postingDocRef = fb.db.collection("postings").doc(req.query["postingId"]);
    let postingDoc = await postingDocRef.get();
    if (!postingDoc.exists) {
        utils.handleServerError(res, "Posting does not exist.");
        return;
    }

    let responseBody = postingDoc.data();
    let postingProfRefValue = postingDoc["_fieldsProto"][CONSTS.PROFESSOR]["referenceValue"]
    let linkedProfessorDocRef = fb.db.collection("users").doc(postingProfRefValue);
    responseBody[CONSTS.PROFESSOR] = linkedProfessorDocRef.id;
    utils.handleSuccess(res, responseBody);
});

exports.deletePosting = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    if (req.method !== "DELETE") {
        return utils.handleBadRequest(res, 'Must be a DELETE request.');
    }

    if (!req.query.hasOwnProperty("idToken") || !req.query.hasOwnProperty("postingId")) {
        utils.handleBadRequest(res, "Missing idToken or postingId.");
        return;
    }

    let idToken = req.query.idToken;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
        utils.handleBadRequest(res, "Token is invalid or expired.");
        return;
    }

    // Find user deleting posting.
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        utils.handleServerError(res, "User does not exist.");
        return;
    }

    // Find document to be deleted.
    let postingDocRef = fb.db.collection("postings").doc(req.query["postingId"]);
    let postingDoc = await postingDocRef.get();
    if (!postingDoc.exists) {
        utils.handleServerError(res, "Posting does not exist.");
        return;
    }

    let postingProfRefValue = postingDoc["_fieldsProto"][CONSTS.PROFESSOR]["referenceValue"]
    let linkedProfessorDocRef = fb.db.collection("users").doc(postingProfRefValue);

    // Check to make sure user is correct.
    if (linkedProfessorDocRef.id !== userDocRef.id) {
        utils.handleBadRequest(res, "Only the original poster can only delete their postings.");
        return;
    }

    postingDocRef.delete();
    console.log("Deleted posting.");
    return utils.handleSuccess(res, {'Success' : 'Deleted posting.'});
});

exports.createPosting = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');


    // Validity checking.
    if (req.method !== "POST") {
        utils.handleBadRequest(res, "Must be a POST request.");
        return;
    }

    if (!req.query.hasOwnProperty("idToken")) {
        utils.handleBadRequest(res, "Missing idToken.");
        return;
    }

    if (!req.body.hasOwnProperty(CONSTS.DESCRIPTION) ||
        !req.body.hasOwnProperty(CONSTS.LAB_NAME) ||
        !req.body.hasOwnProperty(CONSTS.TITLE) ||
        !req.body.hasOwnProperty(CONSTS.TAGS)) {
        utils.handleBadRequest(res, "Missing title, lab name, or description, or tags.");
        return;
    }

    let idToken = req.query.idToken;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
        utils.handleBadRequest(res, "Token is invalid or expired.");
        return;
    }

    // Find user creating posting.
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return utils.handleServerError(res, "User does not exist.");
    }

    // Check to make sure user is not student.
    if (userDoc["_fieldsProto"][CONSTS.IS_STUDENT]["booleanValue"]) {
        return utils.handleBadRequest(res, "Students cannot make postings.");
    }

    // Constructing posting document.
    let postingJson = {
        [CONSTS.TITLE]: req.body[CONSTS.TITLE],
        [CONSTS.LAB_NAME]: req.body[CONSTS.LAB_NAME],
        [CONSTS.PROFESSOR]: userDocRef,
        [CONSTS.DESCRIPTION]: req.body[CONSTS.DESCRIPTION],
        [CONSTS.TAGS]: req.body[CONSTS.TAGS]
    }

    let requirements = {};
    if (req.body.hasOwnProperty(CONSTS.REQUIREMENTS)) {
        requirements = req.body[CONSTS.REQUIREMENTS];
    }

    postingJson[CONSTS.REQUIREMENTS] = requirements;
    fb.db.collection(CONSTS.POSTINGS).add(postingJson)
        .then(function (postingDocRef) {
            // Adding reference to user document.
            userDocRef.update({ "postings": FieldValue.arrayUnion(postingDocRef) });
            utils.handleSuccess(res, { "id": postingDocRef.id });
        }).catch(function (error) {
            utils.handleServerError(res, error);
        });
    return;
});

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