const functions = require('firebase-functions');
const CONSTS = require('./constants.js');
const fb = require('./firebase.js');
const utils = require('./utils.js');


exports.getConfig = functions.https.onRequest(async (req, res) => {
  // for manually handling POST/OPTIONS CORS policy
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');

  // Validity checking.
  if (req.method !== "GET") {
      utils.handleBadRequest(res, "Must be a GET request.");
      return;
  }

  try {
	  const bucket = fb.storage.bucket("research-bay.appspot.com");
	  const file = bucket.file(CONSTS.CONFIG);

	  const config_file = await file.download();
	  const config = JSON.parse(config_file.toString('utf8'));

		return utils.handleSuccess(res, config);
	} catch (err) {
    return utils.handleServerError(res, err);
	}
});
