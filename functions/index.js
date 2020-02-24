const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore();

/**
 *	REST HTTP Endpoint for CRUD operations on the users/profile documents
 *  Documentation is on Github
 */
exports.user = functions.https.onRequest((req, res) => {

	var user = req.query.username;

	if (!user) {
		res.status(400).status({ "error" : "No username query given"});
		return;
	}

	// getting id of firestore collection given username
	var docRef = db.collection("users").where("username", "==", user).limit(1);


	docRef.get().then(querySnapshot => {
		if (!querySnapshot.empty) {
			querySnapshot.forEach(doc => {
				switch(req.method) {
					case 'GET':
						getUser(doc, res);
						break;
					case 'POST':
						res.status(400).send({ "error" : "User already exists"});
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
				res.status(404).send({ "error" : "User " + user + " not found"});
			}
		}
	});


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
			delete data[user]["user"]; // removing firestore reference to users collection
			res.status(200).send(data);
		} else {
			data["error"] = user + ' profile document not created';
			res.status(404).send(data);
		}
	}).catch(err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
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
	var userDocRef = db.collection("users").doc(); // TODO
	var id = userDocRef.id; // TODO change to auth user id once it is setup
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
	profile_doc["year"] = json.hasOwnProperty("year") && typeof json["year"] == "int" ? json["year"] : null;
	profile_doc["name"] = json.hasOwnProperty("name") && typeof json["name"] == "string" ? json["name"] : "";

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


/**
 * @param doc 		doc reference of profile
 * @param json 		body of the http request
 * @param res 		response of request
 */
function updateUser(doc, json, res) {

	var profileDocRef = doc.data().profile;
	var verifiedData = verifyUserJson(json);

	profileDocRef.update(verifiedData).catch( err => {
		console.log(err);
		res.status(400).send({ "error" : "Server Error" });
		return;
	});

	res.status(200).send({ "success" : "User updated succesfully"});
}


/**
 * @param doc 		doc reference of profile
 * @param res 		response of request
 */
function deleteUser(doc, res) {
	var profileDocRef = doc.data().profile;
	
	// get the profileDocRef data in case the delete is unsuccessful
	// avoids just having one side of the profile deleted
	profileDocRef.get().then( docSnapshot => {
		profileDocRef.delete().catch( err => {
			console.log(err);
			res.status(400).send({ "error" : "User delete unsuccessful"});
			return;
		});
		doc.ref.delete().catch( err => {
			console.log(err);
			res.status(400).send({ "error" : "User deleted unsuccessful"});
			profileDocRef.set(docsSnapshot.data());
			return;
		});
	})
	
	res.status(200).send({ "success" : "User deleted succesfully"});
	return;
}

/**
 *	@param json 		json that we want to sanitize
 */
function verifyUserJson(json) {
	var valid_fields = [["major", "string"], ["year", "int"], ["name", "string"]];

	var verifiedData = {};

	valid_fields.forEach( fields => {
		if (fields[0] in json && typeof json[fields[0]] == fields[1]) {
			verifiedData[fields[0]] = json[fields[0]];
		}
	});

	if ("skills" in json && Array.isArray(json["skills"])) {
		verifiedData["skills"] = json["skills"];
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
