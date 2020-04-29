const functions = require('firebase-functions');
const CONSTS = require('./constants.js');
const utils = require('./utils.js');
const fb = require('./firebase.js');
const auth = require('./auth.js');




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

  let recRef = fb.db.collection(CONSTS.REC).doc(decodedUid);
	let recDoc = await recRef.get();
  if (!recDoc.exists) {
      return utils.handleServerError(res, "Recommendations for current user does not exist.");
  }

  let recData = recDoc.data();

  // get profile data
  try {
	  let prof_results = [];
	  for (profile_id of recData[CONSTS.PROFILES]) {
	  	let profRef = fb.db.collection("profiles").doc(profile_id);
	  	let profDoc = await profRef.get();

	  	// checking if profile exists
	  	if (!profDoc.exists) {
	  		console.log(`Recommended User ${profile_id} does not exist`);
	      return utils.handleServerError(res, "Recommended user does not exist.");
	      break;
	  	}
	    let { user, ...data } = profDoc.data();

	    data[CONSTS.ID] = profile_id;
	    prof_results.push(data);
	  }
	  recData[CONSTS.PROFILES] = prof_results;

	  // get posting data
	  let post_results = [];
	  for (post_id of recData[CONSTS.POSTINGS]) {
	  	let postRef = fb.db.collection(CONSTS.POSTINGS).doc(post_id);
	  	let postDoc = await postRef.get();

	  	// checking if profile exists
	  	if (!postDoc.exists) {
	  		console.log(`Recommended Post ${post_id} does not exist`);
	      return utils.handleServerError(res, "Recommended post does not exist.");
	      break;
	  	}
	    let { professor, applicants, ...data } = postDoc.data();
	    data[CONSTS.PROFESSOR_ID] = professor.id;
	    data[CONSTS.ID] = post_id;
	    post_results.push(data);
	  }
	  recData[CONSTS.POSTINGS] = post_results;

	  return utils.handleSuccess(res, recData);
	} catch (err) {
    return utils.handleServerError(res, err);
	}
});
