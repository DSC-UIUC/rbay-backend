const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore();
const professor = "professors";
const student 	= "students";

function getProfile(standing, name, res) {
	
	var docRef = db.collection(standing).doc(name);
	var data = {};
	docRef.get().then(docSnapshot => {
		if (docSnapshot.exists) {
			console.log("exists");
			data[name] = docSnapshot.data();
			res.status(200).send(data);
		} else {
			data["error"] = name + ' does not exist!';
			res.status(404).send(data);
		}
	});
	return;
}

function createProfile(standing, name, res, payload) {
	// TODO adding parameter checks
	var docRef = db.collection(standing).doc(name);
	docRef.set(payload);
	res.status(200).send(name + " profile created");
	return;
}

function deleteProfile(standing, name, res, payload) {
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

function updateProfile(standing, name, res, payload) {
	// TODO adding parameter checks
	var docRef = db.collection(standing).doc(name);
	docRef.get().then(docSnapshot => {
		if (docSnapshot.exists) {
			docRef.update(payload);
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

