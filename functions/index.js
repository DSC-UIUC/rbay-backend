const auth = require('./auth.js');
const profile = require('./profile.js');

exports.signIn = auth.signIn;
exports.signUp = auth.signUp;
exports.checkToken = auth.checkToken;

exports.getProfile = profile.getProfile;
