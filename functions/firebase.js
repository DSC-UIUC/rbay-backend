const functions = require('firebase-functions');
const admin = require("firebase-admin");
const firebase = require('firebase');

const dev_config = functions.config().developer.key;
const api_key = functions.config().api.key;
const firebaseConfig = process.env.FIREBASE_CONFIG;

if (firebaseConfig) {
    firebase.initializeApp(firebaseConfig);
}

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://research-bay.firebaseio.com"
});

exports.db = admin.firestore();
exports.storage = admin.storage();
exports.admin = admin;
