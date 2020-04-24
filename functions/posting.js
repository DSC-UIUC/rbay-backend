const functions = require('firebase-functions');
const firestore = require('firestore')
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');
const FieldValue = require('firebase-admin').firestore.FieldValue;

function validateDataTypes(body, selectedApplicantCheck) {
    // Requirements validation.
    if (CONSTS.REQUIREMENTS in body) {
        let requirements = body[CONSTS.REQUIREMENTS];
        if ((CONSTS.GPA in requirements && typeof requirements[CONSTS.GPA] !== 'number') ||
            (CONSTS.YEAR in requirements && typeof requirements[CONSTS.YEAR] !== 'number')) {
            return false;
        }

        if ((CONSTS.MAJOR in requirements && !Array.isArray(requirements[CONSTS.MAJOR])) ||
            (CONSTS.COURSES in requirements && !Array.isArray(requirements[CONSTS.COURSES]))) {
            return false;
        }

        if (CONSTS.MAJOR in requirements) {
            for (let i = 0; i < requirements[CONSTS.MAJOR].length; i++) {
                if (typeof requirements[CONSTS.MAJOR][i] !== 'string') {
                    return false;
                }
            }
        }

        if (CONSTS.COURSES in requirements) {
            for (let i = 0; i < requirements[CONSTS.COURSES].length; i++) {
                if (typeof requirements[CONSTS.COURSES][i] !== 'string') {
                    return false;
                }
            }
        }
    }

    // Array-type validation (tags, applicant and selected applicants)
    if (!Array.isArray(body[CONSTS.TAGS]) || //|| !Array.isArray(body[CONSTS.APPLICANTS]) ||
        (selectedApplicantCheck && !Array.isArray(body[CONSTS.SELECTED_APPLICANTS]))) {
        return false;
    }

    /*for (let i = 0; i < body[CONSTS.APPLICANTS].length; i++) {
        if (typeof body[CONSTS.APPLICANTS][i] !== 'string') { // are we storing them as references or as strings?
            return false;
        }
    }*/

    for (let i = 0; i < body[CONSTS.TAGS].length; i++) {
        if (typeof body[CONSTS.TAGS][i] !== 'string') {
            return false;
        }
    }

    if (selectedApplicantCheck) {
        for (let i = 0; i < body[CONSTS.SELECTED_APPLICANTS].length; i++) {
            if (typeof body[CONSTS.SELECTED_APPLICANTS][i] !== 'string') {
                return false;
            }
        }
    }

    // Remaining field check.
    return typeof body[CONSTS.DESCRIPTION] === 'string' &&
        typeof body[CONSTS.LAB_NAME] === 'string' &&
        typeof body[CONSTS.TITLE] === 'string' &&
        (!(CONSTS.IS_OPEN in body) || typeof body[CONSTS.IS_OPEN] === 'boolean') &&
        typeof body[CONSTS.PROFESSOR_NAME] === 'string';
}

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

exports.applyToPosting = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    // Validity checking.
    if (req.method !== "POST") {
        utils.handleBadRequest(res, "Must be a POST request.");
        return;
    }

    if (!req.body.hasOwnProperty("idToken") || !req.body.hasOwnProperty("postingId")) {
        utils.handleBadRequest(res, "Missing idToken or postingId.");
        return;
    }

    let idToken = req.body.idToken;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
        utils.handleBadRequest(res, "Token is invalid or expired.");
        return;
    }

    // Find user applying to posting.
    let userDocRef = fb.db.collection("users").doc(decodedUid);
    let userDoc = await userDocRef.get();
    let userDocData = await userDoc.data();
    if (!userDoc.exists) {
        utils.handleServerError(res, "User does not exist.");
        return;
    }

    if (!userDocData[CONSTS.IS_STUDENT]) {
        utils.handleBadRequest(res, "Only students can apply to postings.");
        return;
    }

    // Find document to be updated.
    let postingDocRef = fb.db.collection("postings").doc(req.body["postingId"]);
    let postingDoc = await postingDocRef.get();

    let currentApplicants = postingDoc.data()[CONSTS.APPLICANTS];
    for (i = 0; i < currentApplicants.length; i++) {
        console.log(currentApplicants[i].id);
        if (decodedUid == currentApplicants[i].id) {
            utils.handleBadRequest(res, "Students cannot make multiple applications to the same posting.");
            return;
        }
    }

    postingDocRef.update({ [CONSTS.APPLICANTS]: FieldValue.arrayUnion(userDocRef) });
    utils.handleSuccess(res, { "Success": decodedUid + " successfully applied to posting" });
    return;
});

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

    if (!req.body.hasOwnProperty("idToken") || !req.body.hasOwnProperty("postingId")) {
        utils.handleBadRequest(res, "Missing idToken or postingId.");
        return;
    }

    if (!req.body.hasOwnProperty(CONSTS.DESCRIPTION) ||
        !req.body.hasOwnProperty(CONSTS.LAB_NAME) ||
        !req.body.hasOwnProperty(CONSTS.TITLE) ||
        !req.body.hasOwnProperty(CONSTS.TAGS) ||
        !req.body.hasOwnProperty(CONSTS.SELECTED_APPLICANTS) ||
        !req.body.hasOwnProperty(CONSTS.IS_OPEN) ||
        // !req.body.hasOwnProperty(CONSTS.APPLICANTS) ||
        !req.body.hasOwnProperty(CONSTS.PROFESSOR_NAME)) {
        utils.handleBadRequest(res, "Missing title, lab name, description, tags, professor name, " + 
            "selected applicant list, or status of posting.");
        return;
    }

    let idToken = req.body.idToken;
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
    let postingDocRef = fb.db.collection("postings").doc(req.body["postingId"]);
    let postingDoc = await postingDocRef.get();
    let postingProfRefValue = postingDoc["_fieldsProto"][CONSTS.PROFESSOR]["referenceValue"]
    let linkedProfessorDocRef = fb.db.collection("users").doc(postingProfRefValue);

    // Check to make sure user is correct.
    if (linkedProfessorDocRef.id !== userDocRef.id) {
        utils.handleBadRequest(res, "Only the original poster can only modify their postings.");
        return;
    }

    if (!validateDataTypes(req.body, true)) {
        utils.handleBadRequest(res, "At least one field in the request has a bad data type.");
        return;
    }

    // Constructing posting document.
    let postingJson = {
        [CONSTS.TITLE]: req.body[CONSTS.TITLE],
        [CONSTS.LAB_NAME]: req.body[CONSTS.LAB_NAME],
        [CONSTS.PROFESSOR]: userDocRef,
        [CONSTS.DESCRIPTION]: req.body[CONSTS.DESCRIPTION],
        [CONSTS.TAGS]: req.body[CONSTS.TAGS],
        // [CONSTS.APPLICANTS]: req.body[CONSTS.APPLICANTS],
        [CONSTS.SELECTED_APPLICANTS]: req.body[CONSTS.SELECTED_APPLICANTS],
        [CONSTS.IS_OPEN]: req.body[CONSTS.IS_OPEN],
        [CONSTS.PROFESSOR_NAME]: req.body[CONSTS.PROFESSOR_NAME]
    }

    let requirements = {};
    if (req.body.hasOwnProperty(CONSTS.REQUIREMENTS)) {
        requirements = req.body[CONSTS.REQUIREMENTS];
    }

    // Updating posting document.
    postingJson[CONSTS.REQUIREMENTS] = requirements;
    postingDocRef.update(postingJson);
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
    let postingProfRefValue = postingDoc["_fieldsProto"][CONSTS.PROFESSOR]["referenceValue"];
    let linkedProfessorDocRef = fb.db.collection("users").doc(postingProfRefValue);

    // Remove applicant list if original poster is not the one making the request.
    if (linkedProfessorDocRef.id !== decodedUid) {
        delete responseBody[CONSTS.APPLICANTS];
    }

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

    if (!req.body.hasOwnProperty("idToken")) {
        utils.handleBadRequest(res, "Missing idToken.");
        return;
    }

    if (!req.body.hasOwnProperty(CONSTS.DESCRIPTION) ||
        !req.body.hasOwnProperty(CONSTS.LAB_NAME) ||
        !req.body.hasOwnProperty(CONSTS.TITLE) ||
        !req.body.hasOwnProperty(CONSTS.TAGS) ||
        !req.body.hasOwnProperty(CONSTS.PROFESSOR_NAME)) {
        utils.handleBadRequest(res, "Missing title, lab name, or description, professor name, or tags.");
        return;
    }

    let idToken = req.body.idToken;
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

    if (!validateDataTypes(req.body, false)) {
        utils.handleBadRequest(res, "At least one field in the request has a bad data type.");
        return;
    }

    // Constructing posting document.
    let postingJson = {
        [CONSTS.TITLE]: req.body[CONSTS.TITLE],
        [CONSTS.LAB_NAME]: req.body[CONSTS.LAB_NAME],
        [CONSTS.PROFESSOR]: userDocRef,
        [CONSTS.DESCRIPTION]: req.body[CONSTS.DESCRIPTION],
        [CONSTS.TAGS]: req.body[CONSTS.TAGS],
        [CONSTS.PROFESSOR_NAME]: req.body[CONSTS.PROFESSOR_NAME]
    }

    let requirements = {};
    if (req.body.hasOwnProperty(CONSTS.REQUIREMENTS)) {
        requirements = req.body[CONSTS.REQUIREMENTS];
    }

    postingJson[CONSTS.REQUIREMENTS] = requirements;
    postingJson[CONSTS.APPLICANTS] = [];
    postingJson[CONSTS.SELECTED_APPLICANTS] = [];
    postingJson[CONSTS.IS_OPEN] = true;
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

exports.closePosting = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return utils.handleBadRequest(res, "Must be a POST request.");
    }

    if (!req.body.hasOwnProperty("idToken") || !req.body.hasOwnProperty("postingId")) {
        utils.handleBadRequest(res, "Missing idToken or postingId.");
        return;
    }

    let idToken = req.body["idToken"];
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

    // Find posting to be closed.
    let postingDocRef = fb.db.collection("postings").doc(req.body["postingId"]);
    let postingDoc = await postingDocRef.get();
    if (!postingDoc.exists) {
        utils.handleServerError(res, "Posting does not exist.");
        return;
    }

    let postingProfRefValue = postingDoc["_fieldsProto"][CONSTS.PROFESSOR]["referenceValue"]
    let linkedProfessorDocRef = fb.db.collection("users").doc(postingProfRefValue);

    // Check to make sure user is correct.
    if (linkedProfessorDocRef.id !== userDocRef.id) {
        utils.handleBadRequest(res, "Only the original poster can only close their own postings.");
        return;
    }

    // Make sure posting hasn't been closed already.
    let postingDocData = postingDoc.data();
    if (!postingDocData[CONSTS.IS_OPEN]) {
        utils.handleBadRequest(res, "This posting has already been closed.");
        return;
    }

    // Close posting.
    postingDocRef.update({ [CONSTS.IS_OPEN] : false});
    utils.handleSuccess(res, { "id": req.body.postingId });
});