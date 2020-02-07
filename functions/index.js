const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore(); 

function getProfile(standing, name, res) {
	
	var docRef = db.collection(standing).doc(name);
	var data = {};
	docRef.get().then(docSnapshot => {
		if (docSnapshot.exists) {
			console.log("exists");
			data[name] = docSnapshot.data();
			res.status(200).send(data);
			// console.log(data);
		} else {
			data["error"] = name + ' does not exist!';
			res.status(404).send(data);
		}
	});
	return;
}


exports.student = functions.https.onRequest((req, res) => {
	var name = req.query.name;

	switch(req.method) {
		case 'GET':
			getProfile("students", name, res);
			break;
	}
	return null;
});


exports.professor = functions.https.onRequest((req, res) => {

	var name = req.query.name;

	switch(req.method) {
		case 'GET':
			getProfile("professors", name, res);
			break;
	}
	return null;});

