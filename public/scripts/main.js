

function loadProfile() {
	profilesListener = firebase.firestore()
		.collection('profiles')
		.orderBy('name', 'desc')
		.limit(3)
		.onSnapshot((snaps) => {
			profilesElement.innerHTML = "";
			// Loop through each profile
			snaps.forEach((doc) => {
			// Create an HTML entry fosr each document and add it to the chat
			const id = document.createElement("p");
			const name = document.createElement("p");
			const major = document.createElement("p");
			const year = document.createElement("p");

			id.textContent = "authId: " + doc.id;
			name.textContent = "Name: " + doc.data().name;
			major.textContent = "Major: " + doc.data().major;
			year.textContent = "Year: " + doc.data().year;

			profilesElement.appendChild(id);
			profilesElement.appendChild(name);
			profilesElement.appendChild(major);
			profilesElement.appendChild(year);
			profilesElement.appendChild(document.createElement("br"));
		});
	});
}

function addProfile() {
	var authId = document.getElementById("authId").value;
	// var authId = firebase.auth().currentUser.uid; UNCOMMENT when combining with auth

	var name = document.getElementById("name");
	var year = document.getElementById("year");
	var major = document.getElementById("major");
	firebase.firestore().collection("profiles").doc(authId).set({
		name:  name.value,
		year:  year.value,
		major: major.value
	});

	// // clear form input field
	name.value = "";
	year.value = "";
	major.value = "";
}

// Create/Update profile
const create_form = document.getElementById('create-profile');
// Listen to the form submission
create_form.addEventListener("submit", (e) => {
	// Prevent the default form redirect
	e.preventDefault();
	addProfile();
});


var profilesElement = document.getElementById('profiles');
var profilesListener = null;
loadProfile();
