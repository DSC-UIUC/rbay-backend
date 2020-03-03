const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore();

// TODO create uid check helper function

exports.devgetuser = functions.https.onRequest((req, res) => {

	// ADD DEV CHECK

	if (req.method != 'GET') {
		res.status(405).send({ "error" : `${ req.method } Method not allowed`});
		return;
	}

	var idToken = req.query.uid; //TODO add uid check
	var user = req.query.username;

	var docRef = db.collection("users").where("username", "==", user).limit(1);

	docRef.get().then(querySnapshot => {
		if (!querySnapshot.empty) {
			querySnapshot.forEach(doc => {
				var data = {};

				var ref = doc.data().profile; // getting the reference to profile doc in users doc
				ref.get().then(docSnapshot => {
					// getting the profile firebase document 
					if (docSnapshot.exists) {
						data[user] = docSnapshot.data();
						delete data[user]["user"]; // removing firestore reference to users collection
						res.status(200).send(data);
					} else {
						// case where profile collection document not created but user document exists
						data["error"] = user + ' profile document not created';
						res.status(404).send(data);
					}
				}).catch(err => {
					// Server error
					console.log(err);
					res.status(400).send({ "error" : "Server Error" });
				});
			});
		} else {
			// no user of that name found
			res.status(404).send({ "error" : "User " + user + " not found"});
		}
	});
});


exports.devcreateuser = functions.https.onRequest((req, res) => {

	// ADD DEV CHECK

	if (req.method != 'POST') {
		res.status(405).send({ "error" : `${ req.method } Method not allowed`});
		return;
	}

	var idToken = req.query.uid; //TODO add uid check
	var user = req.query.username;

	var docRef = db.collection("users").where("username", "==", user).limit(1);
	// checking if user exists
	docRef.get().then(querySnapshot => {
		if (!querySnapshot.empty) {
			// overwriting existing user not allowed
			res.status(400).send({ "error" : "User already exists"});
			return;
		} else {
			// helper function to create new account and post to firestore
			createUser(user, req.body, res);
		}
	});
});

/**
 * @param res 		response of request
 * @param json 	user info
 * required fields in body should be major, name, skills, year, email, is_student, username
 */
function createUser(username, json, res) {
	// creating user document first
	var userDocRef = db.collection("users").doc(); // TODO
	var id = userDocRef.id; // TODO change to auth user id once it is setup TODO
	var user_doc = {};

	user_doc["postings"] = [];
	user_doc["profile"] = db.collection("profiles").doc(id);
	user_doc["username"] = username;

	user_doc["email"] = json.hasOwnProperty("email") && typeof json["email"] == "string" ? json["email"] : null;
	user_doc["is_student"] = json.hasOwnProperty("is_student") && typeof json["is_student"] == "boolean" ? json["is_student"] : null;

	// creating profile doc
	var profileDocRef = db.collection("profiles").doc(id);
	var profile_doc = {};
	profile_doc["user"] = userDocRef;
	profile_doc["major"] = json.hasOwnProperty("major") && typeof json["major"] == "string" ? json["major"] : null;
	profile_doc["skills"] = json.hasOwnProperty("skills") && Array.isArray(json["skills"]) ? json["skills"] : [];
	profile_doc["name"] = json.hasOwnProperty("name") && typeof json["name"] == "string" ? json["name"] : "";

	// checking that year is within range
	if (json.hasOwnProperty("year") && typeof json["year"] == "number" && json["year"] > 0 && json["year"] <= 4) {
		profile_doc["year"] = json["year"];
	} else {
		profile_doc["year"] = null;
	}


	userDocRef.set(user_doc).catch( err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
		return;
	});
	profileDocRef.set(profile_doc).catch( err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
		userDocRef.delete(); // Deleting user document because profile doc was not created
		return;
	});

	res.status(200).send({ "success" : username + " created succesfully"});
}


exports.devdeleteuser = functions.https.onRequest((req, res) => {

	// ADD DEV CHECK

	if (req.method != 'DELETE') {
		res.status(405).send({ "error" : `${ req.method } Method not allowed`});
		return;
	}

	var idToken = req.query.uid; //TODO add uid check
	var user = req.query.username;

	var docRef = db.collection("users").where("username", "==", user).limit(1);
	docRef.get().then(querySnapshot => {
		if (!querySnapshot.empty) {
			// profile exists
			querySnapshot.forEach(doc => {
				var profileDocRef = doc.data().profile; // getting profile collection doc
				// get the profileDocRef data in case the delete is unsuccessful
				// avoids just having only one side of the profile deleted
				profileDocRef.get().then( docSnapshot => {
					// deleting profile collection doc
					profileDocRef.delete().catch( err => {
						console.log(err);
						res.status(400).send({ "error" : "User delete unsuccessful"});
						return;
					});
					// deleting user collection doc
					doc.ref.delete().catch( err => {
						console.log(err);
						res.status(400).send({ "error" : "User deleted unsuccessful"});
						profileDocRef.set(docsSnapshot.data()); // adding profile doc back
						return;
					});
				})
				
				res.status(200).send({ "success" : "User deleted succesfully"});
			});
		} else {
			// cannot delete nonexistent profile
			res.status(404).send({ "error" : "User " + user + " not found"});
		}
	});
});


exports.devupdateuser = functions.https.onRequest((req, res) => {

	// ADD DEV CHECK

	if (req.method != 'PUT') {
		res.status(405).send({ "error" : `${ req.method } Method not allowed`});
		return;
	}

	var idToken = req.query.uid; //TODO add uid check
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
	});

});


// /**
//  * @param doc 		doc reference of profile
//  * @param res 		response of request
//  */
// function getUser(doc, res) {

// 	var user = doc.data().username;
// 	var data = {};

// 	var ref = doc.data().profile;
// 	ref.get().then(docSnapshot => {
// 		if (docSnapshot.exists) {
// 			data[user] = docSnapshot.data();
// 			delete data[user]["user"]; // removing firestore reference to users collection
// 			res.status(200).send(data);
// 		} else {
// 			data["error"] = user + ' profile document not created';
// 			res.status(404).send(data);
// 		}
// 	}).catch(err => {
// 		console.log(err);
// 		res.status(400).send({ "error" : "Server Error" });
// 	});
// 	return;
// }




/**
 * @param doc 		doc reference of profile
 * @param json 		body of the http request
 * @param res 		response of request
 */
function updateUser(doc, json, res) {

	var profileDocRef = doc.data().profile;
	var verifiedData = verifyUserJson(json);

	// console.log(verifiedData);
	if (Object.keys(verifiedData).length != 0) {

		profileDocRef.update(verifiedData).catch( err => {
			console.log(err);
			res.status(400).send({ "error" : "Server Error" });
			return;
		});

		res.status(200).send({ "success" : "User updated succesfully"});
	} else {
		res.status(404).send({ "error" : "No valid update parameter given"});
	}
}


// /**
//  * @param doc 		doc reference of profile
//  * @param res 		response of request
//  */
// function deleteUser(doc, res) {
// 	var profileDocRef = doc.data().profile;
	
// 	// get the profileDocRef data in case the delete is unsuccessful
// 	// avoids just having one side of the profile deleted
// 	profileDocRef.get().then( docSnapshot => {
// 		profileDocRef.delete().catch( err => {
// 			console.log(err);
// 			res.status(400).send({ "error" : "User delete unsuccessful"});
// 			return;
// 		});
// 		doc.ref.delete().catch( err => {
// 			console.log(err);
// 			res.status(400).send({ "error" : "User deleted unsuccessful"});
// 			profileDocRef.set(docsSnapshot.data());
// 			return;
// 		});
// 	})
	
// 	res.status(200).send({ "success" : "User deleted succesfully"});
// 	return;
// }

/**
 *	@param json 		json that we want to sanitize
 */
function verifyUserJson(json) {
	var valid_fields = [["major", "string"], ["name", "string"]];

	var verifiedData = {};

	valid_fields.forEach( fields => {
		if (fields[0] in json && typeof json[fields[0]] == fields[1]) {
			verifiedData[fields[0]] = json[fields[0]];
		}
	});

	if ("skills" in json && Array.isArray(json["skills"])) {
		verifiedData["skills"] = json["skills"];
	} 
	if ("year" in json && typeof json["year"] == "number" && json["year"] > 0 && json["year"] <= 4) {
		verifiedData["year"] = json["year"];
	}
	return verifiedData;
}




// ----------------------------------------------------------
// ----------------------------------------------------------
// ----------------------------------------------------------

const professor = "professors";
const student 	= "students";

// required fields for a profile
const req_stud_fields = [["GPA", "int"], ["Year", "string"], ["About Me", "string"]
						, ["Major", "string"], ["Coursework", "object"], ["Skills", "object"]
						, ["Research Interests", "object"]];
const req_prof_fields = [["Bio", "string"], ["Courses Taught", "object"]
						, ["Email", "string"], ["Research Areas", "object"]];
/**
 *	 HTTP Endpoint for student collection 
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
 *	 HTTP Endpoint for professor collection 
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

	req_fields.forEach( fields => {
		if (fields[0] in json) {
			if (typeof json[fields[0]] == fields[1]) {
				verifiedData[fields[0]] = json[fields[0]];
			}
		}
	});

	return verifiedData;
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
			console.log(err);
			res.status(400).send({ "error" : "Server Error" });
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
			console.log(err);
			res.status(400).send({ "error" : "Server Error" });
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
	}).catch(err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
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
	}).catch(err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
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
	}).catch(err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
	});
}
