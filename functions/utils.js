exports.handleBadRequest = (res, msg) => {
  res.status(400).send({
    message: "Invalid request: " + msg
  });
}

exports.handleServerError = (res, err) => {
  res.status(500).send({
    message: "Internal server error: " + err
  });
}

exports.handleSuccess = (res, data) => {
  res.status(200).send({
    message: "OK",
    data: data,
  });
}
