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
