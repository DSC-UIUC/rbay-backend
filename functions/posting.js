const functions = require('firebase-functions');
const firestore = require('firestore')
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');
const FieldValue = require('firebase-admin').firestore.FieldValue;

async function validateDataTypes(body, checkApplicants) {
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

    // Tags validation.
    if (!Array.isArray(body[CONSTS.TAGS])) {
        return false;
    }

    for (let i = 0; i < body[CONSTS.TAGS].length; i++) {
        if (typeof body[CONSTS.TAGS][i] !== 'string') {
            return false;
        }
    }

    // Applicant field check.
    if (checkApplicants) {
        if (!(CONSTS.APPLICANTS in body)) {
            return false;
        }

        let applicantList = body[CONSTS.APPLICANTS];
        for (let i = 0; i < applicantList.length; i++) {
            let application = applicantList[i];
            if (typeof application !== 'object' ||
                !(CONSTS.ID in application) ||
                !(CONSTS.IS_SELECTED in application) ||
                Object.keys(application).length != 2 || 
                typeof application[CONSTS.ID] !== 'string' ||
                typeof application[CONSTS.IS_SELECTED] !== 'boolean') {
                return false;
            }

            let userDocRef = fb.db.collection("users").doc(application[CONSTS.ID]);
            let userDoc = await userDocRef.get();
            if (!userDoc.exists) {
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
        let { professor, ...postData } = postingDoc.data();

        // setting the professor name in the posting data
        let profUserRef = await professor.get();
        let profProfileRef = await profUserRef.data()[CONSTS.PROFREF].get();
        let professorName = profProfileRef.data()[CONSTS.NAME];
        postData[CONSTS.PROFESSOR] = professorName;
        postData[CONSTS.PROFESSOR_ID] = profUserRef.id;

        // adding postingID to returned data
        postData[CONSTS.ID] = postingDoc.id;

        // setting applicant and selected_applicant fields
        let cleanedApp = [];
        for (appRef of postData[CONSTS.APPLICANTS]) {
            cleanedApp.push(appRef.id);
        }
        postData[CONSTS.APPLICANTS] = cleanedApp;
        let cleanedSelectedApp = [];
        if (postData[CONSTS.SELECTED]) {
            for (selectedAppRef of postData[CONSTS.SELECTED]) {
                cleanedSelectedApp.push(selectedAppRef.id);
            }
        }
        postData[CONSTS.SELECTED] = cleanedSelectedApp;

        data.push(postData);
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
        console.log(currentApplicants[i][CONSTS.ID]);
        if (decodedUid == currentApplicants[i][CONSTS.ID]) {
            utils.handleBadRequest(res, "Students cannot make multiple applications to the same posting.");
            return;
        }
    }

    // Add applicant to list of applicants.
    postingDocRef.update({
        [CONSTS.APPLICANTS]: FieldValue.arrayUnion({
            [CONSTS.ID]: decodedUid, [CONSTS.IS_SELECTED]: false }),
    });
    userDocRef.update({ [CONSTS.POSTINGS]: FieldValue.arrayUnion(postingDocRef) });
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

    if (!req.body.hasOwnProperty("idToken") || !req.body.hasOwnProperty("postingId") ||
        typeof req.body["idToken"] !== 'string' || typeof req.body["postingId"] !== 'string') {
        utils.handleBadRequest(res, "Missing idToken or postingId of string type.");
        return;
    }

    if (!req.body.hasOwnProperty(CONSTS.DESCRIPTION) ||
        !req.body.hasOwnProperty(CONSTS.LAB_NAME) ||
        !req.body.hasOwnProperty(CONSTS.TITLE) ||
        !req.body.hasOwnProperty(CONSTS.TAGS) ||
        !req.body.hasOwnProperty(CONSTS.IS_OPEN) ||
        !req.body.hasOwnProperty(CONSTS.PROFESSOR_NAME) ||
        !req.body.hasOwnProperty(CONSTS.APPLICANTS)) {
        utils.handleBadRequest(res, "Missing title, lab name, description, tags, professor name, " + 
            "applicant list, or status of posting.");
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

    if (!await validateDataTypes(req.body, true)) {
        utils.handleBadRequest(res, "At least one field in the request is invalid.");
        return;
    }

    // Constructing posting document.
    let postingJson = {
        [CONSTS.TITLE]: req.body[CONSTS.TITLE],
        [CONSTS.LAB_NAME]: req.body[CONSTS.LAB_NAME],
        [CONSTS.PROFESSOR]: userDocRef,
        [CONSTS.DESCRIPTION]: req.body[CONSTS.DESCRIPTION],
        [CONSTS.TAGS]: req.body[CONSTS.TAGS],
        [CONSTS.IS_OPEN]: req.body[CONSTS.IS_OPEN],
        [CONSTS.PROFESSOR_NAME]: req.body[CONSTS.PROFESSOR_NAME],
        [CONSTS.APPLICANTS]: req.body[CONSTS.APPLICANTS]
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

    if (!req.body.hasOwnProperty("idToken") || typeof req.body["idToken"] !== 'string') {
        utils.handleBadRequest(res, "Missing idToken of string type.");
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

    if (!await validateDataTypes(req.body, false)) {
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
    let postingDocRef = fb.db.collection("postings").doc(postingId);
    let postingDoc = await postingDocRef.get();
    if (!postingDoc.exists) {
        utils.handleServerError(res, "Posting does not exist.");
        return;
    }
    if (!postingDoc[CONSTS.IS_OPEN]) {
      utils.handleServerError(res, "Posting is already closed");
    }

    // postingDocRef.update({ [CONSTS.SELECTED]: FieldValue.arrayUnion(userDocRef) });


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