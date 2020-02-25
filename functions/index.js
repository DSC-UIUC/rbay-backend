const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore();
const professor = "professors";
const student = "students";

// required fields for a profile
const req_stud_fields = ["GPA", "Year", "About Me", "Major", "Coursework", "Skills", "Research Interests"];
const req_prof_fields = ["Bio", "Courses Taught", "Email", "Research Areas"];

/**
 *	Removes any unknown elements in the given json
 *
 *	@param standing 	indicates whether profile is student or professor
 *	@param json 		body of the http request
 */
function verifyJson(standing, json) {
    var req_fields = [];

    // checking if profile is student or professor
    if (student.localeCompare(standing) == 0) {
        req_fields = req_stud_fields;
    } else if (professor.localeCompare(standing) == 0) {
        req_fields = req_prof_fields;
    }

    var verifiedData = {};

    for (var key in json) {
        if (req_stud_fields.includes(key)) {
            verifiedData[key] = json[key];
        }
    }
    return verifiedData
}

/**
 *
 * @param standing 	indicates whether profile is student or professor
 * @param name 		name of profile
 * @param res 		response of request
 */
function getProfile(standing, name, res, amount) {

    if (name) {
        var docRef = db.collection(standing).doc(name);
        var data = {};

        docRef.get().then(docSnapshot => {
            if (docSnapshot.exists) {
                data[name] = docSnapshot.data();
                res.status(200).send(data);
            } else {
                data["error"] = name + ' does not exist!';
                res.status(404).send(data);
            }
        }).catch(err => {
            res.status(400).send({ "error": err });
        });
    } else {
        var amount = amount ? amount : 5;
        var data = {}
        var docRef = db.collection(standing).limit(amount);
        docRef.get().then(docsSnapshot => {
            docsSnapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });
            res.status(200).send(data);
        }).catch(err => {
            res.status(400).send({ "error": err });
        });
    }
    return;
}



/**
 * @param standing 	indicates whether profile is student or professor
 * @param name 		name of profile
 * @param res 		response of request
 * @param payload 	request body
 */
function createProfile(standing, name, res, payload) {

    if (!name) {
        res.status(400).send({ "error": "Expected name query" });
        return;
    }

    var verifiedData = verifyJson(standing, payload);
    var docRef = db.collection(standing).doc(name);

    docRef.get().then(docSnapshot => {
        if (!docSnapshot.exists) {
            docRef.set(payload);
            res.status(200).send({ "success": name + " profile created" });
        } else {
            res.status(400).send({ "error": name + " already exists" });
        }
    }).catch(err => {
        res.status(400).send({ "error": err });
    });
    return;
}

/**
 * @param standing 	indicates whether profile is student or professor
 * @param name 		name of profile
 * @param res 		response of request
 */
function deleteProfile(standing, name, res) {

    if (!name) {
        res.status(400).send({ "error": "Expected name query" });
        return;
    }

    var docRef = db.collection(standing).doc(name);
    docRef.get().then(docSnapshot => {
        if (docSnapshot.exists) {
            docRef.delete();
            res.status(200).send({ "success": name + " deleted succesfully" });
        } else {
            res.status(400).send({ "error": name + " does not exist" });
        }
    }).catch(err => {
        res.status(400).send({ "error": err });
    });
    return;
}

/**
 * @param standing 	indicates whether profile is student or professor
 * @param name 		name of profile
 * @param res 		response of request
 * @param payload 	request body
 */
function updateProfile(standing, name, res, payload) {

    if (!name) {
        res.status(400).send({ "error": "Expected name query" });
        return;
    }

    var verifiedData = verifyJson(standing, payload);
    var docRef = db.collection(standing).doc(name);
    docRef.get().then(docSnapshot => {
        if (docSnapshot.exists) {
            docRef.update(verifiedData);
            res.status(200).send({ "success": name + " updated succesfully" });
        } else {
            res.status(400).send({ "error": name + " does not exist" });
        }
    }).catch(err => {
        res.status(400).send({ "error": err });
    });
}

exports.student = functions.https.onRequest((req, res) => {

    var name = req.query.name;

    switch (req.method) {
        case 'GET':
            getProfile(student, name, res, parseInt(req.query.amount));
            break;
        case 'POST':
            createProfile(student, name, res, req.body);
            break;
        case 'DELETE':
            deleteProfile(student, name, res);
            break;
        case 'PUT':
            updateProfile(student, name, res, req.body);
            break;
    }
    return null;
});


exports.professor = functions.https.onRequest((req, res) => {

    var name = req.query.name;

    switch (req.method) {
        case 'GET':
            getProfile(professor, name, res, parseInt(req.query.amount));
            break;
        case 'POST':
            createProfile(professor, name, res, req.body);
            break;
        case 'DELETE':
            deleteProfile(professor, name, res);
            break;
        case 'PUT':
            updateProfile(professor, name, res, req.body);
            break;
    }
    return null;
});


/**
 * @param doc 		doc reference of profile
 * @param res 		response of request
 */
function getUser(doc, res) {

    var user = doc.data().username;
    var data = {};

    var ref = doc.data().profile;
    ref.get().then(docSnapshot => {
        if (docSnapshot.exists) {
            data[user] = docSnapshot.data();
            delete data[user]["user"];
            res.status(200).send(data);
        } else {
            data["error"] = user + ' profile not created';
            res.status(404).send(data);
        }
    }).catch(err => {
        res.status(400).send({ "error": err });
    });
    return;
}

/**
 * @param res 		response of request
 * @param json 	user info
 * required fields in body should be major, name, skills, year, email, is_student, username
 */
function createUser(username, json, res) {
    // creating user document first
    var userDocRef = db.collection("users").doc();
    var user_doc = {};

    user_doc["postings"] = [];
    user_doc["profile"] = db.collection("profiles").doc(userDocRef.id);
    user_doc["username"] = username;
    if (json.hasOwnProperty("email")) {
        user_doc["email"] = json["email"];
    }
    if (json.hasOwnProperty("is_student")) {
        user_doc["is_student"] = json["is_student"];
    }
    // creating profile doc
    var profileDocRef = db.collection("profiles").doc(userDocRef.id);
    var profile_doc = {};
    profile_doc["user"] = userDocRef;
    if (json.hasOwnProperty("major")) {
        profile_doc["major"] = json["major"];
    }
    if (json.hasOwnProperty("skills")) {
        profile_doc["skills"] = json["skills"];
    }
    if (json.hasOwnProperty("year")) {
        profile_doc["year"] = json["year"];
    }
    if (json.hasOwnProperty("name")) {
        profile_doc["name"] = json["name"];
    }

    userDocRef.set(user_doc);
    profileDocRef.set(profile_doc);

    res.status(200).send({ "success": username + " created succesfully" });
    return;
}

function updateUser(doc, json, res) {
    var verifiedJson = verifyUserJson(json);

    doc.update(verifiedJson);

    res.status(200).send({ "success": "User updated succesfully" });
}


/**
 * @param doc 		doc reference of profile
 * @param res 		response of request
 */
function deleteUser(doc, res) {
    var profileDocRef = doc.data().profile;
    profileDocRef.delete();
    doc.ref.delete();
    res.status(200).send({ "success": "User deleted succesfully" });
    return;
}


function verifyUserJson(json) {
    var valid_fields = ["major", "skills", "year", "name"];

    var verifiedData = {};

    for (var key in json) {
        if (req_stud_fields.includes(key)) {
            verifiedData[key] = json[key];
        }
    }
    return verifiedData;
}


exports.user = functions.https.onRequest((req, res) => {

    var user = req.query.username;

    // getting id of firestore collection given username
    var docRef = db.collection("users").where("username", "==", user).limit(1);


    docRef.get().then(querySnapshot => {
        if (!querySnapshot.empty) {
            querySnapshot.forEach(doc => {
                switch (req.method) {
                    case 'GET':
                        getUser(doc, res);
                        break;
                    case 'POST':
                        res.status(400).send({ "error": "User already exists" });
                        break;
                    case 'DELETE':
                        deleteUser(doc, res);
                        break;
                    case 'PUT':
                        updateUser(doc, req.body, res);
                        break;
                }
            });
        } else {
            if (req.method == 'POST') {
                createUser(user, req.body, res);
            } else {
                res.status(404).send({ "error": "User " + user + " not found" });
            }
        }
    });


    return null;
});

exports.signUp = functions.https.onRequest((request, response) => {
    switch (request.method) {
        case 'POST':
            var email = request.body.email;
            var password = request.body.password;
            var name = request.body.name;
            // users containing profile reference
            // profile is connected to profiles which is connected to users

            // TODO: make new json object with request.query.email

            admin.auth().createUser({
                email: email,
                password: password
            }).then(function (userRecord) {
                // See the UserRecord reference doc for the contents of userRecord.
                // console.log('Successfully created new user:', userRecord.uid);
                createUser(userRecord.uid, request.body, response);
            }).catch(function (error) {
                response.status(400).send({ 'failure': error });
            });
            break;
        default:
            response.status(400).send({ 'failure': 'Must be a POST request.' });
    }
});

exports.signIn = functions.https.onRequest((request, response) => {
    var idToken = request.query.token;

    admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
            let uid = decodedToken.uid;
            admin.auth().getUser(uid)
                .then(function (userRecord) {
                    email = userRecord.email;
                    var docRef = db.collection("users").where("email", "==", email).limit(1);
                    docRef.get().then(querySnapshot => {
                        querySnapshot.forEach(doc => {
                            //var dict = doc["_fieldsProto"];
                            //var keys = dict.keys();

                            // var data = {};

                            
                            response.status(200).send(doc["_fieldsProto"]);
                            // getUser(doc, response);
                        });
                    });
                    /*var user = docRef.data().username;
                    var data = {};

                    var ref = docRef.data();
                    ref.get().then(docSnapshot => {
                        if (docSnapshot.exists) {
                            data[user] = docSnapshot.data();
                            delete data[user]["user"];
                            response.status(200).send(data);
                        } else {
                            data["error"] = user + ' profile not created';
                            response.status(404).send(data);
                        }
                    }).catch(err => {
                        res.status(400).send({ "error": err });
                    });
                    /*docRef.get().then(docSnapshot => {
                        var data = {};
                        if (docSnapshot.exists) {
                            data[user] = docSnapshot.data();
                            delete data[user]["user"];
                            respose.status(200).send(data);
                        } else {
                            data["error"] = user + ' profile not created';
                            response.status(404).send(data);
                        }
                    }).catch(err => {
                        response.status(400).send({ "error": err });
                    });*/
                    //response.status(200).send(docRef.data());
                    /*docRef.get().then(querySnapshot => {
                        querySnapshot.forEach(doc => {
                            getUser(doc, response);
                        });
                    });*/
                })
                .catch(function (error) {
                    response.status(400).send('Login failed: ' + error);
                });
        }).catch(function (error) {
            response.status(400).send('Login failed: ' + error);
        });
   
    return;
});