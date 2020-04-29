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

function getSearchPostings(searchQuery) {

    const client_search = algoliasearch(functions.config().algolia.appid, functions.config().algolia.searchkey);
    searchindex = client_search.initIndex('postings');

    return searchindex.search(searchQuery);



}


function getSearchProfiles(searchQuery) {

    const client_search = algoliasearch(functions.config().algolia.appid, functions.config().algolia.searchkey);
    searchindex = client_search.initIndex('profiles');

    return searchindex.search(searchQuery);

}

exports.getSearch = functions.https.onRequest(async (req, res) => {
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

        let profiles_results = [];
        let postings_results = [];
        getSearchProfiles(searchQuery).then(({hits}) => {

            for(const obj of hits) {

                var profileresult = {id : obj.objectID, name : obj.data.name,
                    year : obj.data.year, major : obj.data.major, about_me : obj.data.about_me, picture: obj.data.picture, department: obj.data.department };

                profiles_results.push(profileresult);

            }

            getSearchPostings(searchQuery).then(({hits}) => {

                for(const obj of hits) {

                    var postingsresult = {id : obj.objectID, description : obj.data.description, description : obj.data.description,
                        is_open : obj.data.is_open, lab_name : obj.data.lab_name, professor: obj.data.professor, professor_name: obj.data.professor_name,
                        requirements : obj.data.requirements, title : obj.data.title, tags : obj.data.tags, picture: obj.data.picture};

                    postings_results.push(postingsresult);

                }

                var search_results = {postings: postings_results, profiles: profiles_results};
                return utils.handleSuccess(res, search_results);
            });
        });

    } catch (err) {
        return utils.handleServerError(res, err);
    }

});
