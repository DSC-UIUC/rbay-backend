const CONSTS = require('./constants.js');

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
    if (CONSTS.NAME in body && typeof body[CONSTS.NAME] === 'string') {
      profile[CONSTS.NAME] = body[CONSTS.NAME];
    }
    if (CONSTS.ABOUT_ME in body && typeof body[CONSTS.ABOUT_ME] === 'string') {
      profile[CONSTS.ABOUT_ME] = body[CONSTS.ABOUT_ME];
    }
    if (CONSTS.GPA in body && body[CONSTS.GPA] > 0 && body[CONSTS.GPA] <= 4) {
      profile[CONSTS.GPA] = body[CONSTS.GPA];
    }
    if (CONSTS.MAJOR in body && Array.isArray(body[CONSTS.MAJOR])) {
      profile[CONSTS.MAJOR] = body[CONSTS.MAJOR];
    }
    if (CONSTS.YEAR in body && body[CONSTS.YEAR] > 0 && body[CONSTS.YEAR] <= 5) {
      profile[CONSTS.YEAR] = body[CONSTS.YEAR];
    }
    if (CONSTS.COURSES in body) {
      profile[CONSTS.COURSES] = body[CONSTS.COURSES];
    }
    if (CONSTS.INTERESTS in body) {
      profile[CONSTS.INTERESTS] = body[CONSTS.INTERESTS];
    }
    if (CONSTS.EXP in body) {
      profile[CONSTS.EXP] = body[CONSTS.EXP];
    }
  } else {
    if (CONSTS.NAME in body && typeof body[CONSTS.NAME] === 'string') {
      profile[CONSTS.NAME] = body[CONSTS.NAME];
    }
    if (CONSTS.ABOUT_ME in body && typeof body[CONSTS.ABOUT_ME] === 'string') {
      profile[CONSTS.ABOUT_ME] = body[CONSTS.ABOUT_ME];
    }
    if (CONSTS.INTERESTS in body) {
      profile[CONSTS.INTERESTS] = body[CONSTS.INTERESTS];
    }
    if (CONSTS.DEPT in body && typeof body[CONSTS.DEPT] === 'string') {
      profile[CONSTS.DEPT] = body[CONSTS.DEPT];
    }
  }
  return profile;
}

// const getProfileDataWithRef = async (profileDocRef) => {
//   try {
//     let profileDoc = await profileDocRef.get();
//     if (profileDoc.exists) {
//       return profileDoc.data();
//     }
//
//     return null;
//   } catch (err) {
//     console.log(err);
//     return null;
//   }
// }
// exports.getProfileDataWithRef = getProfileDataWithRef;
