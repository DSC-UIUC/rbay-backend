const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore();
const professor = "professors";
const student 	= "students";

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
function getProfile(standing, name, res) {
	
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
	});
	return;
}

/**
 * @param standing 	indicates whether profile is student or professor
 * @param name 		name of profile
 * @param res 		response of request
 * @param payload 	request body
 */
function createProfile(standing, name, res, payload) {

	var verifiedData = verifyJson(standing, payload);

	var docRef = db.collection(standing).doc(name);

	docRef.get().then(docSnapshot => {
		if (!docSnapshot.exists) {
			docRef.set(payload);
			res.status(200).send(name + " profile created");
		} else {
			res.status(400).send(name + " already exists");
		}
	})
	return;
}

/**
 * @param standing 	indicates whether profile is student or professor
 * @param name 		name of profile
 * @param res 		response of request
 */
function deleteProfile(standing, name, res) {
	var docRef = db.collection(standing).doc(name);
	docRef.get().then(docSnapshot => {
		if (docSnapshot.exists) {
			docRef.delete();
			res.status(200).send(name + " deleted succesfully");
		} else {
			res.status(400).send(name + " does not exist");
		}
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
	var verifiedData = verifyJson(standing, payload);
	var docRef = db.collection(standing).doc(name);
	docRef.get().then(docSnapshot => {
		if (docSnapshot.exists) {
			docRef.update(verifiedData);
			res.status(200).send(name + " updated succesfully");
		} else {
			res.status(400).send(name + " does not exist");
		}
	})
}

exports.student = functions.https.onRequest((req, res) => {
	var name = req.query.name;

	switch(req.method) {
		case 'GET':
			if (name) {
				getProfile(student, name, res);
			} else {
				res.status(400).send("Name not given");
			}
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

	switch(req.method) {
		case 'GET':
			if (name) {
				getProfile(professor, name, res);
			} else {
				res.status(400).send("Name not given");
			}		
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

