const functions = require('firebase-functions');

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://research-bay.firebaseio.com"
});

var db = admin.firestore(); 


exports.student = functions.https.onRequest((req, res) => {
	var name = req.query.name;

	switch(req.method) {
		case 'GET':
			if (name) {
				var docRef = db.collection("students").doc(name);

				docRef.get().then(docSnapshot => {
					if (docSnapshot.exists) {
						// Case where given name exists
						var data = {};
						data[name] = docSnapshot.data();
						res.status(200).send(data);
					} else {
						res.status(404).send(name + ' does not exist!');
					}
				});
			} else {
				res.status(400).send("No query name given");
			}
			break;
	}
	return null;
});


exports.professors = functions.https.onRequest((req, res) => {

	var name = req.query.name;

	switch(req.method) {
		case 'GET':
			if (name) {
				var docRef = db.collection("professors").doc(name);

				docRef.get().then(docSnapshot => {
					if (docSnapshot.exists) {
						// Case where given name exists
						var data = {};
						data[name] = docSnapshot.data();
						res.status(200).send(data);
					} else {
						res.status(404).send(name + ' does not exist!');
					}
				});
			} else {
				res.status(400).send("No query name given");
			}
			break;
	}
	return null;});

