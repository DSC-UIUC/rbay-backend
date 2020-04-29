const auth = require('./auth.js');
const profile = require('./profile.js');
const posting = require('./posting.js');
const config = require('./config.js');
const search = require('./search.js');
const recommendation = require('./recommendation.js');

exports.changePassword = auth.changePassword;
exports.deleteUser = auth.deleteUser;

exports.signIn = auth.signIn;
exports.signUp = auth.signUp;
exports.checkToken = auth.checkToken;

exports.getProfile = profile.getProfile;
exports.getProfileById = profile.getProfileById
exports.setProfile = profile.setProfile;
exports.getProfileFileSignedUrl = profile.getProfileFileSignedUrl;
exports.setProfileFile = profile.setProfileFile;

exports.getUserPostings = posting.getUserPostings;
exports.getUserRecommendations = recommendation.getUserRecommendations;

exports.createPosting = posting.createPosting;
exports.updatePosting = posting.updatePosting;
exports.deletePosting = posting.deletePosting;
exports.getPostingById = posting.getPostingById;
exports.applyToPosting = posting.applyToPosting;
exports.selectApplicantForPosting = posting.selectApplicantForPosting;
exports.closePosting = posting.closePosting;

exports.getConfig = config.getConfig;

exports.updatePostingAlgolia = search.updatePostingAlgolia;
exports.updateProfilesAlgolia = search.updateProfilesAlgolia;

exports.getSearch = search.getSearch;