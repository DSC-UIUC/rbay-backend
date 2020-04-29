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

    if (CONSTS.TAGS in body) {
        // Tags validation.
        if (!Array.isArray(body[CONSTS.TAGS])) {
            return false;
        }

        for (let i = 0; i < body[CONSTS.TAGS].length; i++) {
            if (typeof body[CONSTS.TAGS][i] !== 'string') {
                return false;
            }
        }
    }
    
    // Applicant field check.
    if (checkApplicants && CONSTS.APPLICANTS in body) {
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
    return (!(CONSTS.DESCRIPTION in body) || typeof body[CONSTS.DESCRIPTION] === 'string') &&
        (!(CONSTS.LAB_NAME in body) || typeof body[CONSTS.LAB_NAME] === 'string') &&
        (!(CONSTS.TITLE in body) || typeof body[CONSTS.TITLE] === 'string') &&
        (!(CONSTS.IS_OPEN in body) || typeof body[CONSTS.IS_OPEN] === 'boolean') &&
        (!(CONSTS.PROFESSOR_NAME in body) || typeof body[CONSTS.PROFESSOR_NAME] === 'string');
}

const getUserPostingsWithRef = async (postingsRefArray, is_student) => {
  let data = [];

  try {
    for (let postingRef of postingsRefArray) {
      let postingDoc = await postingRef.get();
      if (postingDoc.exists) {
        let { professor, ...postData } = postingDoc.data();

        // adding prof id
        postData[CONSTS.PROFESSOR_ID] = professor.id;

        // adding postingID to returned data
        postData[CONSTS.ID] = postingDoc.id;

        // setting applicant and selected_applicant fields
        if (is_student) {
            delete postData[CONSTS.APPLICANTS];
        } else {
            let appDetailed = [];
            for (app of postData[CONSTS.APPLICANTS]) {
                let appRef = await fb.db.collection("profiles").doc(app[CONSTS.ID]);
                let appDoc = await appRef.get();
                let { user, ...appData } = appDoc.data();
                appDetailed.push({
                    [CONSTS.IS_SELECTED] : app[CONSTS.IS_SELECTED],
                    [CONSTS.NAME] : appData[CONSTS.NAME],
                    [CONSTS.YEAR] : appData[CONSTS.YEAR],
                    [CONSTS.MAJOR]: appData[CONSTS.MAJOR],
                    [CONSTS.ID]   : app[CONSTS.ID]
                });
            }
            postData[CONSTS.APPLICANTS] = appDetailed;
        }

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

    if (req.method === "OPTIONS") {
        return res.end();
    }

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

    if (req.method === "OPTIONS") {
        return res.end();
    }

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
        utils.handleBadRequest(res, "At least one field in the request has a bad data type.");
        return;
    }

    // Create object with fields that need to be updated.
    let fields = [CONSTS.TITLE, CONSTS.LAB_NAME, CONSTS.DESCRIPTION, CONSTS.TAGS, CONSTS.IS_OPEN, CONSTS.PROFESSOR_NAME, CONSTS.APPLICANTS, CONSTS.REQUIREMENTS];
    let updateJson = {};
    for (let i = 0; i < fields.length; i++) {
        if (fields[i] in req.body) {
            updateJson[fields[i]] = req.body[fields[i]];
        }
    }

    // Updating posting document.
    if (Object.keys(updateJson).length === 0) {
        utils.handleBadRequest(res, "At least one field must be updated.");
        return;
    }
    postingDocRef.update(updateJson);
    utils.handleSuccess(res, { "id": postingDocRef.id })
    return;
});

exports.getPostingById = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    if (req.method === "OPTIONS") {
        return res.end();
    }

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
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS, DELETE');
    res.set('Access-Control-Allow-Headers', '*');

    if (req.method === "OPTIONS") {
        return res.end();
    }

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

    utils.deletePostingAndReferences(postingDocRef, decodedUid);
    return utils.handleSuccess(res, {'Success' : 'Deleted posting.'});
});

exports.createPosting = functions.https.onRequest(async (req, res) => {
    // for manually handling POST/OPTIONS CORS policy
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');

    if (req.method === "OPTIONS") {
        return res.end();
    }
  
    // Validity checking.
    if (req.method !== "POST") {
      return utils.handleBadRequest(res, "Must be a POST request.");
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
        utils.handleBadRequest(res, "Missing title, lab name, description, professor name, or tags.");
        return;
    }

    let idToken = req.body.idToken;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
      return utils.handleBadRequest(res, "Token is invalid or expired.");
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
        [CONSTS.PROFESSOR_NAME]: req.body[CONSTS.PROFESSOR_NAME],
        [CONSTS.DESCRIPTION]: req.body[CONSTS.DESCRIPTION],
        [CONSTS.TAGS]: req.body[CONSTS.TAGS],
        [CONSTS.PROFESSOR_NAME]: req.body[CONSTS.PROFESSOR_NAME],
        [CONSTS.APPLICANTS] : [],
        [CONSTS.IS_OPEN]: true,
        [CONSTS.REQUIREMENTS]: req.body.hasOwnProperty(CONSTS.REQUIREMENTS) ? req.body[CONSTS.REQUIREMENTS] : {}
    }

    try {
      let postingDocRef = await fb.db.collection(CONSTS.POSTINGS).add(postingJson);
      userDocRef.update({ "postings": FieldValue.arrayUnion(postingDocRef) });
      return utils.handleSuccess(res, { "id": postingDocRef.id });
    } catch (err) {
      return utils.handleServerError(res, err);
    }
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

    let postingsRefArray = userDoc.data()[CONSTS.POSTINGS];
    let data = await getUserPostingsWithRef(postingsRefArray, userDoc.data()[CONSTS.IS_STUDENT]);

    utils.handleSuccess(res, { entries: data });
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

    if (!(req.body.hasOwnProperty("idToken") && req.body.hasOwnProperty("postingId") && req.body.hasOwnProperty("applicant"))) {
        return utils.handleBadRequest(res, "Missing idToken, postingId, or applicant UID.");
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
    if (!(userDocData[CONSTS.POSTINGS].find(post => post.id === postingId))) {
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
    let postingDocData = await postingDoc.data();
    if (!postingDocData[CONSTS.IS_OPEN]) {
      utils.handleBadRequest(res, "Posting is already closed");
      return;
    }

      let applicants = postingDocData[CONSTS.APPLICANTS];
      for (let i = 0; i < applicants.length; i++) {
          if (applicants[i][CONSTS.ID] === req.body.applicant && !applicants[i][CONSTS.IS_SELECTED]) {
              applicants[i][CONSTS.IS_SELECTED] = true;
              postingDocRef.update({ [CONSTS.APPLICANTS]: applicants });
              utils.handleSuccess(res, req.body.applicant + " successfully selected");
              return;
          } else if (applicants[i][CONSTS.ID] === req.body.applicant && applicants[i][CONSTS.IS_SELECTED]) {
              utils.handleBadRequest(res, "Given Applicant is already selected");
              return;
          }
      }

      utils.handleBadRequest(res, "Given Applicant did not apply for this posting");
      return;
  } catch(err) {
    utils.handleServerError(res, err);
  }
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
