const CONSTS = require('./constants.js');
const FieldValue = require('firebase-admin').firestore.FieldValue;
const fb = require('./firebase.js');

exports.handleBadRequest = (res, msg) => {
  return res.status(400).send({
    message: "Invalid request: " + msg
  });
}

exports.handleServerError = (res, err) => {
  return res.status(500).send({
    message: "Internal server error: " + err
  });
}

exports.handleSuccess = (res, data) => {
  return res.status(200).send({
    message: "OK",
    data: data,
  });
}

exports.verifyFieldsProfile = (is_student, body) => {

  var profile = {};

  if (is_student) {
    // student profile
    if (CONSTS.GPA in body && typeof body[CONSTS.GPA] === 'number' && body[CONSTS.GPA] > 0 && body[CONSTS.GPA] <= 4) {
      profile[CONSTS.GPA] = Number(body[CONSTS.GPA].toPrecision(3));
    }
    if (CONSTS.YEAR in body && Number.isInteger(body[CONSTS.YEAR]) && body[CONSTS.YEAR] > 0 && body[CONSTS.YEAR] <= 5) {
      profile[CONSTS.YEAR] = body[CONSTS.YEAR];
    }
    if (CONSTS.MAJOR in body && typeof body[CONSTS.MAJOR] == 'string') {
      profile[CONSTS.MAJOR] = body[CONSTS.MAJOR];
    }
    
    if (CONSTS.COURSES in body && Array.isArray(body[CONSTS.COURSES])) {
      profile[CONSTS.COURSES] = [];
      for (course of body[CONSTS.COURSES]) {
        if (typeof course === 'string') {
          profile[CONSTS.COURSES].push(course);
        }
      }
    }
    if (CONSTS.EXP in body && Array.isArray(body[CONSTS.EXP])) {
      profile[CONSTS.EXP] = [];
      for (exp of body[CONSTS.EXP]) {
        if (typeof exp === 'object') {
          profile[CONSTS.EXP].push(exp);
        }
      }
    }
    if (CONSTS.SKILLS in body && Array.isArray(body[CONSTS.SKILLS])) {
      profile[CONSTS.SKILLS] = [];
      for (skill of body[CONSTS.SKILLS]) {
        if (typeof skill === 'string') {
          profile[CONSTS.SKILLS].push(skill);
        }
      }
    }
  } else {
    // professor profile
    if (CONSTS.DEPT in body && typeof body[CONSTS.DEPT] === 'string') {
      profile[CONSTS.DEPT] = body[CONSTS.DEPT];
    }
  }

  // shared fields 
  if (CONSTS.NAME in body && typeof body[CONSTS.NAME] === 'string') {
    profile[CONSTS.NAME] = body[CONSTS.NAME];
  }
  if (CONSTS.ABOUT_ME in body && typeof body[CONSTS.ABOUT_ME] === 'string') {
    profile[CONSTS.ABOUT_ME] = body[CONSTS.ABOUT_ME];
  }
  if (CONSTS.PIC in body && typeof body[CONSTS.PIC] === 'string') {
    profile[CONSTS.PIC] = body[CONSTS.PIC];
  }
  if (CONSTS.WEBSITE in body && typeof body[CONSTS.WEBSITE] === 'string') {
    profile[CONSTS.WEBSITE] = body[CONSTS.WEBSITE];
  }
  if (CONSTS.INTERESTS in body && Array.isArray(body[CONSTS.INTERESTS])) {
    profile[CONSTS.INTERESTS] = [];
    for (interest of body[CONSTS.INTERESTS]) {
      if (typeof interest === 'string') {
        profile[CONSTS.INTERESTS].push(interest);
      }
    }
  }

  return profile;
}

exports.deletePostingAndReferences = async (postingDocRef, uid) => {
    let postingDoc = await postingDocRef.get();
    let userDocRef = fb.db.collection("users").doc(uid);
    // Remove posting reference from professor user doc.
    userDocRef.update({ [CONSTS.POSTINGS]: FieldValue.arrayRemove(postingDocRef) });

    // Remove posting reference from all applicants' user doc.
    let applicants = postingDoc.data()[CONSTS.APPLICANTS];
    for (let i = 0; i < applicants.length; i++) {
        let applicantRef = fb.db.collection("users").doc(applicants[i][CONSTS.ID]);
        applicantRef.update({ [CONSTS.POSTINGS]: FieldValue.arrayRemove(postingDocRef) });
    }

    postingDocRef.delete();
    console.log("Deleted posting.");
}