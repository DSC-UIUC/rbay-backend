const functions = require('firebase-functions');

// process.env.NODE_CONFIG_DIR = '../config';
// const config = require('config');

const dev_config = functions.config().developer.key;

var admin = require("firebase-admin");

const firebase = require('firebase');

var firebaseConfig = process.env.FIREBASE_CONFIG;

if (firebaseConfig) {
    firebase.initializeApp(firebaseConfig);
}

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore();

const NAME = 'name';
const ABOUT_ME = 'aboutme';
const COURSES = 'coursework';
const GPA = 'gpa';
const MAJOR = 'major';
const YEAR = 'year';
const EXP = 'experience';
const INTERESTS = 'research interests';
const RESEARCH = 'research';
const IS_STUDENT = 'is_student';
const EMAIL = 'email';
const USERNAME = 'username';
const PROFREF = 'profile';
const USERREF = 'user';
const POSTINGS = 'postings';

exports.getuser = functions.https.onRequest((req, res) => {

	if (req.method !== 'GET') {
		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});

	}

	var idToken = req.query.token;
	if (!idToken || idToken === "") {
		return res.status(400).send({ 'error' : 'No token given'});
	}

	admin.auth().verifyIdToken(idToken).then(decodedToken => {
  	// case where token is valid
    let uid = decodedToken.uid;
    var userDocRef = db.collection('users').doc(uid); // once authentication is combined, each doc id should be uid
    userDocRef.get().then(userDoc => {
    	// getting user doc to get the username
    	if (userDoc.exists) {
    		var profileDocRef = userDoc.data().profile;
    		var user = userDoc.data().username;
    		profileDocRef.get().then(profileDoc => {
    			if (profileDoc.exists) {
    				var data = {};
    				data[user] = profileDoc.data();
    				delete data[user]['user']; // deleting firestore reference to other collection
    				res.status(200).send(data);
    			} else {
    				res.status(404).send({ 'error' : `Profile Document nonexistent for ${user}`})
    			}
    			return null;
    		}).catch(err => {
					console.log(err);
    			return res.status(400).send({ 'error' : 'Could not get profile document'});
    		});
    	} else {
    		res.status(404).send({ 'error' : 'No user with this token'})
    	}
    	return null;
    }).catch(err => {
    	console.log(err);
    	return res.status(400).send({ 'error' : 'Could not get user documnet'});
    });
    return null;
  }).catch(error => {
    console.log(error);
    return res.status(400).send({ 'error' : 'Invalid token'});
  });
});

exports.createuser = functions.https.onRequest((req, res) => {

	if (req.method !== 'POST') {
		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
	}

	var idToken = req.query.token;
	if (!idToken || idToken === "") {
		return res.status(400).send({ 'error' : 'No token given'});
	}

	admin.auth().verifyIdToken(idToken).then(decodedToken => {
  	let uid = decodedToken.uid;
		var userDocRef = db.collection('users').doc(uid);

		userDocRef.get().then(userDoc => {
			if (userDoc.exists) {
				res.status(400).send({ "error" : `Profile already exists`});
			} else {
				createUser(uid, req.body, res);
			}
			return null;
		}).catch(err => {
			console.log(err);
			return res.status(400).send({'error':'Could not get user document'});
		});
		return null;
	}).catch(error => {
    console.log(error);
    return res.status(400).send({ 'error' : 'Invalid token'});
	});
})

exports.updateuser = functions.https.onRequest((req, res) => {

	if (req.method !== 'PUT') {
		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
	}

	var idToken = req.query.token;
	if (!idToken || idToken === "") {
		return res.status(400).send({ 'error' : 'No token given'});
	}

	admin.auth().verifyIdToken(idToken).then(function(decodedToken) {
  	let uid = decodedToken.uid;
		var userDocRef = db.collection('users').doc(uid);

		userDocRef.get().then(userDoc => {
			if (userDoc.exists) {
				updateUser(userDoc, req.body, res);
			} else {
				res.status(204).send({ "error" : `Profile does not exists`});
			}
			return null;
		}).catch(err => {
			console.log(err);
			return res.status(400).send({ 'error' : 'Error getting user document'});
		});
		return null;
	}).catch(error => {
    console.log(error);
    res.status(400).send({ 'error' : 'Invalid token'});
    return null;
	});
})

exports.deleteuser = functions.https.onRequest((req, res) => {

	if (req.method !== 'DELETE') {
		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
	}

	var idToken = req.query.token;
	if (!idToken || idToken === "") {
		return res.status(400).send({ 'error' : 'No token given'});
	}

	admin.auth().verifyIdToken(idToken).then(function(decodedToken) {
  	let uid = decodedToken.uid;
		var userDocRef = db.collection('users').doc(uid);

		userDocRef.get().then(userDoc => {
			if (userDoc.exists) {
				deleteUser(userDoc, res);
			} else {
				res.status(204).send({ "error" : `Profile does not exists`});
			}
			return null;
		}).catch(err => {
			console.log(err);
			return res.status(400).send( {'error' : 'Error getting user document'});
		});
		return null;
	}).catch(error => {
    console.log(error);
    return res.status(400).send({ 'error' : 'Invalid token'});
	});
})


// ----------------------------------------------------------
// --------------------DEV ENDPOINTS-------------------------
// ----------------------------------------------------------
// TODO secure each endpoint
exports.devgetuser = functions.https.onRequest((req, res) => {

    var key = req.query.developerKey;
    if (key !== dev_config) {
        return res.status(400).send({ 'error': "Invalid developer credentials." });
    } else {
    	if (req.method !== 'GET') {
    		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
    	}

    	var user = req.query.username;

    	var docRef = db.collection("users").where("username", "==", user).limit(1);

    	docRef.get().then(querySnapshot => {
    		if (!querySnapshot.empty) {
    			querySnapshot.forEach(doc => {
    				getUser(doc, res);
    			});
    		} else {
    			// no user of that name found
    			res.status(404).send({ "error" : `User ${user} not found`});
    		}
    		return null;
    	}).catch(err => {
    		console.log(err);
    		return res.status(400).send({ 'error' : 'Error getting user document'});
    	});
    }
});

exports.devcreateuser = functions.https.onRequest((req, res) => {

    var key = req.query.developerKey;
    if (key !== dev_config) {
        return res.status(400).send({ 'error': "Invalid developer credentials." });
    } else {
    	if (req.method !== 'POST') {
	    	return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
    	}

    	var user = req.query.username;
    	var uid = req.query.uid;

    	if (user === null || uid === null) {
    		return res.status(400).send({ 'error' : 'Missing required query params username or uid'});
    	}

    	var docRef = db.collection("users").where("username", "==", user).limit(1);
    	// checking if user exists
    	docRef.get().then(querySnapshot => {
    		if (!querySnapshot.empty) {
    			// overwriting existing user not allowed
    			return res.status(400).send({ "error" : `${user} already exists`});
    		} else {
    			// helper function to create new account and post to firestore
    			createUser(uid, req.body, res);
    		}
    		return null;
    	}).catch(err => {
    		console.log(err);
    		return res.status(400).send({'error' : 'Error getting user document'});
    	});
    }
});

exports.devdeleteuser = functions.https.onRequest((req, res) => {

	// ADD DEV CHECK
    var key = req.query.developerKey;
    if (key !== dev_config) {
        return res.status(400).send({ 'error': "Invalid developer credentials." });
    } else {
    	if (req.method !== 'DELETE') {
    		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
    	}

    	var user = req.query.username;

    	var docRef = db.collection("users").where("username", "==", user).limit(1);
    	docRef.get().then(querySnapshot => {
    		if (!querySnapshot.empty) {
    			// profile exists
    			querySnapshot.forEach(doc => {
    				deleteUser(doc, res);
    			});
    		} else {
    			// cannot delete nonexistent profile
    			res.status(404).send({ "error" : "User " + user + " not found"});
    		}
    		return null;
    	}).catch(err => {
    		console.log(err);
    		return res.status(400).send({'error' : 'Trouble with getting query results'});
    	});
    }
});

exports.devupdateuser = functions.https.onRequest((req, res) => {

	// ADD DEV CHECK
    var key = req.query.developerKey;
    if (key !== dev_config) {
        return res.status(400).send({ 'error': "Invalid developer credentials." });
    } else {
    	if (req.method !== 'PUT') {
    		return res.status(405).send({ "error" : `${ req.method } Method not allowed`});
    	}

    	var user = req.query.username;

    	var docRef = db.collection("users").where("username", "==", user).limit(1);
    	docRef.get().then(querySnapshot => {
    		if (!querySnapshot.empty) {
    			querySnapshot.forEach(doc => {
    				updateUser(doc, req.body, res);
    			});
    		} else {
    			// cannot update nonexistent profile
    			res.status(404).send({ "error" : "User " + user + " not found"});
    		}
    		return null;
    	}).catch(err => {
    		console.log(err);
    		return res.status(400).send({ 'error' : 'Error getting user document'});
    	});
    }
});

function getUser(doc, res) {
	var data = {};

	var ref = doc.data().profile; // getting the reference to profile doc in users doc
	ref.get().then(docSnapshot => {
		// getting the profile firebase document 
		if (docSnapshot.exists) {
			data[doc.data().username] = docSnapshot.data();
			delete data[doc.data().username]["user"]; // removing firestore reference to users collection
			res.status(200).send(data);
		} else {
			// case where profile collection document not created but user document exists
			data["error"] = doc.data().username + ' profile document not created';
			res.status(404).send(data);
		}
		return null;
	}).catch(err => {
		// Server error
		console.log(err);
		return res.status(400).send({ "error" : "Error getting profile document" });
	});
}

/**
 * Helper Function to create a user
 * @param res 		response of request
 * @param json 	user info
 */
function createUser(uid, json, res) {

	// REQUIRED FIELD IS is_student, email, username
	if (!(json.hasOwnProperty(IS_STUDENT) && json.hasOwnProperty(EMAIL) && json.hasOwnProperty(USERNAME))) {
		return res.status(400).send( { 'error' : `Missing required parameter ${IS_STUDENT}, ${EMAIL}, or ${USERNAME}`});
	}

	var docRef = db.collection("users").where("username", "==", json[USERNAME]).limit(1);

	docRef.get().then(querySnapshot => {
		if (!querySnapshot.empty) {
			return res.status(400).send({ "error" : `User with username ${json[USERNAME]} already exists`});
		} else {
			// creating user document first
			var userDocRef = db.collection("users").doc(uid);
			var profileDocRef = db.collection("profiles").doc(uid);
			var userJson = createUserJson(json[IS_STUDENT], json[EMAIL], json[USERNAME], profileDocRef, json[POSTINGS]);

			var profileJson;
			if (json[IS_STUDENT]) {
				profileJson = createStudentProfileJson(json[NAME], json[ABOUT_ME], json[COURSES], json[GPA], json[MAJOR], json[YEAR], json[EXP], json[INTERESTS], userDocRef);
			} else {
				profileJson = createProfProfileJson(json[NAME], json[ABOUT_ME], json[COURSES], json[RESEARCH], userDocRef);
			}

			userDocRef.set(userJson).catch( err => {
				console.log(err);
				return res.status(400).send({ "error" : "Error setting user document" });
			});
			profileDocRef.set(profileJson).catch( err => {
				console.log(err);
				res.status(400).send({ "error" : "Error setting profile document" });
				userDocRef.delete(); // Deleting user document because profile doc was not created
				return null;
			});

			res.status(200).send({ "success" : `Profile created succesfully`});
		}
		return null;
	}).catch(err => {
		console.log(err);
		return res.status(400).send({ 'error' : 'Error getting user document'});
	});
}


function deleteUser(doc, res) {
	var profileDocRef = doc.data().profile; // getting profile collection doc
	// get the profileDocRef data in case the delete is unsuccessful
	// avoids just having only one side of the profile deleted
	if (profileDocRef !== null) {
		profileDocRef.get().then( docSnapshot => {
			// deleting profile collection doc
			if (docSnapshot.exists) {
				profileDocRef.delete().catch( err => {
					console.log(err);
					return res.status(400).send({ "error" : "User delete unsuccessful"});
				});
			}
			// deleting user collection doc
			doc.ref.delete().catch( err => {
				console.log(err);
				res.status(400).send({ "error" : "User deleted unsuccessful"});
				profileDocRef.set(docsSnapshot.data()); // adding profile doc back
				return null;
			});
			return null;
		}).catch(err => {
			console.log(err);
			return res.status(400).send({'error' : 'Error getting profile document'});
		});
	} else {
		doc.ref.delete().catch( err => {
			console.log(err);
			return res.status(400).send({ "error" : "User deleted unsuccessful"});
		});
	}
	
	res.status(200).send({ "success" : "User deleted succesfully"});
}

/**
 * @param doc 		doc reference of profile
 * @param json 		body of the http request
 * @param res 		response of request
 */
function updateUser(doc, json, res) {
	var profileDocRef = doc.data().profile;

	// only allowed to update email and postings in the user document
	var userJson = createUserJson(null, json[EMAIL], null, null, json[POSTINGS]);

	var profileJson;
	if (doc.data().is_student) {
		profileJson = createStudentProfileJson(json[NAME], json[ABOUT_ME], json[COURSES], json[GPA], json[MAJOR], json[YEAR], json[EXP], json[INTERESTS], null);
	} else {
		profileJson = createProfProfileJson(json[NAME], json[ABOUT_ME], json[COURSES], json[RESEARCH], null);
	}

	if (Object.keys(userJson).length !== 0) {
		db.collection('users').doc(doc.id).update(userJson).catch( err => {
			console.log(err);
			return res.status(400).send({ 'error' : 'Error updating user document'});
		});
	}

	if (Object.keys(profileJson).length !== 0) {
		profileDocRef.update(profileJson).catch( err => {
			console.log(err);
			return res.status(400).send({ "error" : "Error updating profile document" });
		});

		return res.status(200).send({ "success" : `${doc.data().username} updated succesfully`});
	} 

	if (Object.keys(profileJson).length !== 0 && Object.keys(userJson).length !== 0) {
		return res.status(404).send({ "error" : "No valid update parameter given"});
	}
}

function createStudentProfileJson(name, aboutme, coursework, gpa, major, year, experience, interests, userRef) {
	var profileDoc = {};

	if (userRef !== null) {
		profileDoc[USERREF] = userRef;
	}
	if (typeof name === 'string') {
		profileDoc[NAME] = name;
	}
	if (typeof aboutme === 'string') {
		profileDoc[ABOUT_ME] = aboutme;
	}
	if (gpa > 0 && gpa <= 4) {
		profileDoc[GPA] = gpa;
	}
	if (typeof major === 'string') {
		profileDoc[MAJOR] = major;
	}
	// year 5 is graduate
	if (year > 0 && year <= 5) {
		profileDoc[YEAR] = year;
	}
	if (coursework !== null && typeof coursework === 'object') {
		profileDoc[COURSES] = coursework;
	}
	if (interests !== null && typeof interests === 'object') {
		profileDoc[INTERESTS] = interests;
	}
	if (experience !== null && typeof experience === 'object') {
		profileDoc[EXP] = experience;
	}
	return profileDoc;
}

function createProfProfileJson(name, aboutme, coursework, research, userRef) {
	var profileDoc = {};
	if (userRef !== null) {
		profileDoc[USERREF] = userRef;
	}
	if (typeof name === 'string') {
		profileDoc[NAME] = name;
	}
	if (typeof aboutme === 'string') {
		profileDoc[ABOUT_ME] = aboutme;
	}
	if (coursework !== null && typeof coursework === 'object') {
		profileDoc[COURSES] = coursework;
	}
	if (research !== null && typeof research === 'object') {
		profileDoc[RESEARCH] = research;
	}
	return profileDoc;
}


function createUserJson(is_student=null, email=null, username=null, profileRef=null, postings=[]) {
	var userDoc = {};

	if (profileRef !== null) {
		userDoc[PROFREF] = profileRef;
	}
	if (typeof is_student === 'boolean') {
		userDoc[IS_STUDENT] = is_student;
	}
	if (typeof email === 'string') {
		userDoc[EMAIL] = email;
	}
	if (typeof username === 'string') {
		userDoc[USERNAME] = username;
	}
	if (Array.isArray(postings)) {
		userDoc[POSTINGS] = postings;
	}
	if (typeof username === 'string') {
		userDoc[USERNAME] = username;
	}
	return userDoc;
}


// exports.user = functions.https.onRequest((req, res) => {
//     userCrud(req, res, false);
// });

// exports.user_dev = functions.https.onRequest((req, res) => {
//     userCrud(req, res, true);
// });

exports.signUp = functions.https.onRequest((request, response) => {

    switch (request.method) {
        case 'POST':
            var email = request.body.email;
            var password = request.body.password;

            admin.auth().createUser({
                email: email,
                password: password
            }).then(userRecord => {
                // See the UserRecord reference doc for the contents of userRecord.
                createUser(userRecord.uid, request.body, response);
                return null;
            }).catch(error => {
            		console.log(error);
                return response.status(400).send({ 'error' : 'Error creating user' });
            });
            break;
        default:
            return response.status(400).send({ 'failure': 'Must be a POST request.' });
    }
});

exports.signIn = functions.https.onRequest((request, response) => {
    switch (request.method) {
        case 'GET':
            var idToken = request.query.token;

            // Verify login token and find user.
            admin.auth().verifyIdToken(idToken)
                .then(decodedToken => {
                    let uid = decodedToken.uid;
                    admin.auth().getUser(uid)
                        .then(userRecord => {
                            // Lookup user in users database.
                            email = userRecord.email;
                            var docRef = db.collection("users").where("email", "==", email).limit(1);
                            docRef.get().then(querySnapshot => {
                                querySnapshot.forEach(doc => {
                                    var dict = doc["_fieldsProto"];
                                    var keys = Object.keys(dict);
                                    var data = {};

                                    for (index in keys) {
                                        var nameKey = keys[index];
                                        var valueTypeKey = dict[nameKey]["valueType"];
                                        var value = dict[nameKey][valueTypeKey];
                                        data[nameKey] = value;
                                    }

                                    response.status(200).send(data);
                                });
                                return null;
                            }).catch(err => {
                            	console.log(err);
                            	return response,status(400).send({'error' : 'Error getting user document'});
                            });
                            return null;
                        })
                        .catch(error => {
                            return response.status(400).send({ 'failure': error });
                        });
                        return null;
                }).catch(error => {
                    return response.status(400).send({ 'failure': error });
                });
            break;
        default:
            return response.status(400).send({ 'failure': 'Must be a GET request.' });
    }
   
    return;
});


// ----------------------------------------------------------
// ----------------------------------------------------------
// ----------------------------------------------------------

const professor = "professors";
const student   = "students";

// required fields for a profile
const req_stud_fields = [["GPA", "int"], ["Year", "string"], ["About Me", "string"]
                        , ["Major", "string"], ["Coursework", "object"], ["Skills", "object"]
                        , ["Research Interests", "object"]];
const req_prof_fields = [["Bio", "string"], ["Courses Taught", "object"]
                        , ["Email", "string"], ["Research Areas", "object"]];
/**
 *   HTTP Endpoint for student collection 
 */
exports.student = functions.https.onRequest((req, res) => {

    var name = req.query.name;

    switch(req.method) {
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

/**
 *   HTTP Endpoint for professor collection 
 */
exports.professor = functions.https.onRequest((req, res) => {

    var name = req.query.name;

    switch(req.method) {
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
 *  Removes any unknown elements in the given json
 *
 *  @param standing     indicates whether profile is student or professor
 *  @param json         body of the http request
 */
function verifyJson(standing, json) {

    var req_fields = [];

    // checking if profile is student or professor
    if (student.localeCompare(standing) === 0) {
        req_fields = req_stud_fields;
    } else if (professor.localeCompare(standing) === 0) {
        req_fields = req_prof_fields;
    }

    var verifiedData = {};

    req_fields.forEach( fields => {
        if (fields[0] in json) {
            if (typeof json[fields[0]] === fields[1]) {
                verifiedData[fields[0]] = json[fields[0]];
            }
        }
    });

    return verifiedData;
}

/**
 *
 * @param standing  indicates whether profile is student or professor
 * @param name      name of profile
 * @param res       response of request
 */
function getProfile(standing, name, res, amount) {

	var docRef, data;

    if (name) {
        docRef = db.collection(standing).doc(name);
        data = {};

        docRef.get().then(docSnapshot => {
            if (docSnapshot.exists) {
                data[name] = docSnapshot.data();
                res.status(200).send(data);
            } else {
                data["error"] = name + ' does not exist!';
                res.status(404).send(data);
            }
            return null;
        }).catch(err => {
            console.log(err);
            res.status(400).send({ "error" : "Server Error" });
            return null;
        });
    } else {
        amount = amount ? amount : 5;
        data = {}
        docRef = db.collection(standing).limit(amount);
        docRef.get().then(docsSnapshot => {
            docsSnapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });
            res.status(200).send(data);
            return null;
        }).catch(err => {
            console.log(err);
            res.status(400).send({ "error" : "Server Error" });
            return null;
        });
    }
    return;
}



/**
 * @param standing  indicates whether profile is student or professor
 * @param name      name of profile
 * @param res       response of request
 * @param payload   request body
 */
function createProfile(standing, name, res, payload) {

    if (!name) {
        res.status(400).send({ "error" : "Expected name query"});
        return;
    }

    var verifiedData = verifyJson(standing, payload);
    var docRef = db.collection(standing).doc(name);

    docRef.get().then(docSnapshot => {
        if (!docSnapshot.exists) {
            docRef.set(verifiedData);
            res.status(200).send({ "success" : name + " profile created"});
        } else {
            res.status(400).send({ "error" : name + " already exists" });
        }
        return null;
    }).catch(err => {
        console.log(err);
        res.status(400).send({ "error" : "Server Error" });
        return null;
    });
    return;
}

/**
 * @param standing  indicates whether profile is student or professor
 * @param name      name of profile
 * @param res       response of request
 */
function deleteProfile(standing, name, res) {

    if (!name) {
        res.status(400).send({ "error" : "Expected name query"});
        return;
    }

    var docRef = db.collection(standing).doc(name);
    docRef.get().then(docSnapshot => {
        if (docSnapshot.exists) {
            docRef.delete();
            res.status(200).send({ "success" : name + " deleted succesfully"});
        } else {
            res.status(400).send({ "error" : name + " does not exist" });
        }
        return null;
    }).catch(err => {
        console.log(err);
        res.status(400).send({ "error" : "Server Error" });
        return null;
    });
    return;
}

/**
 * @param standing  indicates whether profile is student or professor
 * @param name      name of profile
 * @param res       response of request
 * @param payload   request body
 */
function updateProfile(standing, name, res, payload) {
    if (!name) {
        res.status(400).send({ "error" : "Expected name query"});
        return;
    }

    var verifiedData = verifyJson(standing, payload);
    var docRef = db.collection(standing).doc(name);
    docRef.get().then(docSnapshot => {
        if (docSnapshot.exists) {
            docRef.update(verifiedData);
            res.status(200).send({ "success" : name + " updated succesfully"});
        } else {
            res.status(400).send({ "error" : name + " does not exist" });
        }
        return null;
    }).catch(err => {
        console.log(err);
        res.status(400).send({ "error" : "Server Error" });
        return null;
    });
}