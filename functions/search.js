const auth = require('./auth.js');
const fb = require('./firebase.js');
const utils = require('./utils.js');
const functions = require('firebase-functions');
const algoliasearch = require("algoliasearch");
const client = algoliasearch.default(functions.config().algolia.appid, functions.config().algolia.apikey);
const postingsindex = client.initIndex('postings');
const profilesindex = client.initIndex('profiles');

exports.updatePostingAlgolia = functions.firestore
    .document('postings/{profId}')
    .onWrite((change, context) => {
        if (change.after.exists) {
            const data = change.after.data();
            const objectID = context.params.profId;
            return postingsindex.saveObject({
                autoGenerateObjectIDIfNotExist: true,
                objectID,
                data
            });
        } else {
            const objectID = context.params.profId;
            return postingsindex.deleteObject(objectID);
        }
});

exports.updateProfilesAlgolia = functions.firestore
    .document('profiles/{profId}')
    .onWrite((change, context) => {
        if (change.after.exists) {
            const data = change.after.data();
            const objectID = context.params.profId;
            return profilesindex.saveObject({
                autoGenerateObjectIDIfNotExist: true,
                objectID,
                data
            });
        } else {
            const objectID = context.params.profId;
            return profilesindex.deleteObject(objectID);
        }
});

exports.getSearchPostings = functions.https.onRequest(async (req, res) => {
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

    if (!req.query.hasOwnProperty("searchQuery")) {
        return utils.handleBadRequest(res, "Missing searchQuery.");
    }

    let idToken = req.query.idToken;
    let searchQuery = req.query.searchQuery;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
      return utils.handleBadRequest(res, "Token is invalid or expired.");
    }

    try {
        const client_search = algoliasearch(functions.config().algolia.appid, functions.config().algolia.searchkey);
        searchindex = client_search.initIndex('postings');
        //let hits = await searchindex.search(searchQuery);

        //return utils.handleSuccess(res, {entries: hits});

        searchindex.search(searchQuery).then(({ hits }) => {
            console.log(hits);
            return utils.handleSuccess(res, hits);
        });

    } catch (err) {
        return utils.handleServerError(res, err);
    }

});


exports.getSearchProfiles = functions.https.onRequest(async (req, res) => {
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

    if (!req.query.hasOwnProperty("searchQuery")) {
        return utils.handleBadRequest(res, "Missing searchQuery.");
    }

    let idToken = req.query.idToken;
    let searchQuery = req.query.searchQuery;
    let decodedUid = await auth.verifyTokenWithAdmin(idToken);
    console.log(decodedUid);
    if (decodedUid == null) {
      return utils.handleBadRequest(res, "Token is invalid or expired.");
    }

    try {
        const client_search = algoliasearch(functions.config().algolia.appid, functions.config().algolia.searchkey);
        searchindex = client_search.initIndex('profiles');


        //let hits = await searchindex.search(searchQuery);

        //return utils.handleSuccess(res, {entries: hits});

        searchindex.search(searchQuery).then(({ hits }) => {
            console.log(hits);
            return utils.handleSuccess(res, hits);
        });

    } catch (err) {
        return utils.handleServerError(res, err);
    }

});