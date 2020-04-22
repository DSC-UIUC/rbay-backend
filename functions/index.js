const auth = require('./auth.js');
const profile = require('./profile.js');
const posting = require('./posting.js');
const config = require('./config.js');

exports.changePassword = auth.changePassword;
exports.deleteUser = auth.deleteUser;

exports.signIn = auth.signIn;
exports.signUp = auth.signUp;
exports.checkToken = auth.checkToken;

exports.getProfile = profile.getProfile;
exports.getProfileById = profile.getProfileById
exports.setProfile = profile.setProfile;

exports.getUserPostings = posting.getUserPostings;
exports.getUserRecommendations = posting.getUserRecommendations;

exports.createPosting = posting.createPosting;
exports.updatePosting = posting.updatePosting;
exports.deletePosting = posting.deletePosting;
exports.getPostingById = posting.getPostingById;
exports.applyToPosting = posting.applyToPosting;
exports.selectApplicantForPosting = posting.selectApplicantForPosting;
exports.closePosting = posting.closePosting;

exports.getConfig = config.getConfig;