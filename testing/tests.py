import requests as rq
import json


def signUp():
	print("Signing up")

	body = {
		"email": "test123@test.com",
		"password": "test1234",
		"is_student": "true",
		"username": "pytest_one"
	}

	res = rq.post(
		"https://us-central1-research-bay.cloudfunctions.net/signUp", data=body)

	print(res.json())
	return res


def signIn(is_student):
	print("Signing in")

	url = "https://us-central1-research-bay.cloudfunctions.net/signIn"

	body = {"email": "test123@test.com", "password": "test1234"} if is_student else {
		"email": "proftest123@test.com", "password": "test1234"}

	res = rq.post(url=url, data=body)

	print(res.json())
	return res


def deleteAcc(idToken):
	print("Deleting")

	body = {"idToken": idToken}
	url = "https://us-central1-research-bay.cloudfunctions.net/deleteUser?idToken="+idToken

	res = rq.delete(url)
	print(res.text)
	return res


def getProfile(idToken):
	print("Getting profile")

	body = {"idToken": idToken}
	url = "https://us-central1-research-bay.cloudfunctions.net/getProfile?idToken="+idToken
	# url = "https://us-central1-research-bay.cloudfunctions.net/getProfile"

	res = rq.get(url)
	print(res.text)
	return res


def setProfile(idToken, profile):
	print("Setting Profile")

	# major and gpa don't seem to work
	# body = {
	# 	"idToken": idToken,
	# 	"aboutme": "I'm actually pretty awesome",
	# 	"gpa": 5,
	# 	"major": ["awesome science"],
	# 	"name": "Narcissist",
	# 	"year": 2,
	# 	"experience": ["A lot"],
	# 	"research_interests": ["I", "Me", "Myself"],
	# 	"coursework": ["Self studies"],
	# 	"skills":["reflection", "awareness"]
	# }

	url = "https://us-central1-research-bay.cloudfunctions.net/setProfile"

	res = rq.post(url, data=profile)
	print(res.text)


def getUserPostings(idToken):
	print("Getting user postings")

	url = "https://us-central1-research-bay.cloudfunctions.net/getUserPostings?idToken="+idToken
	print(url)

	res = rq.get(url)
	print(res.text)
	return res


def createPosting(idToken):
	print("Creating posting")

	url = "https://us-central1-research-bay.cloudfunctions.net/createPosting?idToken="+idToken
	print(url)

	body = {
		"tags": ["narcissism", "love", "self", "me"],
		"title": "Awesomeness research",
		"lab_name": "Lab of Cephissus",
		"description": "Looking a good looking young man who is self centered and arrogant",
		"requirements": {
			"gpa": 3.99,
			"year": 3,
			"major": ["Computer Science", "Computer Enginering"],
			"coursework": ["Data Structures", "Algorithms", "Architecture"]
		}
	}

	res = rq.post(url, data=body)
	print(res.text)
	return res


def deletePosting(idToken, postingId):
	print("Deleting posting")

	url = "https://us-central1-research-bay.cloudfunctions.net/deletePosting?idToken=" + \
		idToken+"&postingId="+postingId

	res = rq.delete(url)
	print(res.text)
	return res


def updatePosting(idToken, postingId):
	print("Updating posting")

	url = "https://us-central1-research-bay.cloudfunctions.net/updatePosting?idToken=" + \
		idToken+"&postingId="+postingId

	body = {
		"tags": ["fishing", "search"],
		"title": "River search",
		"lab_name": "Lab of Cephissus",
		"description": "Looking athletic person to help look for a person in a river. Must be able to swim and dive",
		"requirements": {
			"gpa": 2.5,
			"year": 2,
			"major": ["Computer Science", "Computer Enginering"],
			"coursework": ["Data Structures", "Algorithms", "River water swimming"]
		}
	}

	res = rq.post(url, data=body)
	print(res.text)
	return res


def applyToPosting(idToken, postingId):
	print("Applying to posting")

	url = "https://us-central1-research-bay.cloudfunctions.net/applyToPosting?idToken=" + \
		idToken+"&postingId="+postingId

	res = rq.post(url)
	print(res.text)
	return res


def main():
	print("Starting Tests")

	a = "works"

	c = "string concat "+a
	print(c)

	newAcc = 0
	is_student = 1

	if newAcc:
		signUp()
		return

	res1 = signIn(is_student).json()
	idToken = res1.get('data', {"idToken": None})['idToken']

	testProfile = 0
	testPostings = 1

	if idToken and testProfile:

		profile = {
			"idToken": idToken,
			"about_me": "I'm actually pretty awesome",
			"gpa": 5.0,
			"major": ["awesome science"],
			"name": "Narcissist",
			"year": 2,
			"experience": ["A lot"],
			"research_interests": ["I", "Me", "Myself"],
			"coursework": ["Self studies"],
			"skills": ["reflection", "awareness"]
		}

		setProfile(idToken, profile)

		res = getProfile(idToken)
		newProfile = res.json()["data"]

		for key in profile:
			if key == "idToken":
				continue
			if newProfile.get(key, "no key") != profile[key]:
				print()
				print(key, " has not been updated properly")
				print("Passed in: ", profile[key])
				print("On record: ", newProfile.get(key, "no key"))

		# deleteAcc(res1['data']['idToken'])
	if idToken and testPostings:
		# res = createPosting(idToken)
		# postingId = res.json()["data"]["id"]
		postingId = "BbNwzzltaYK6rjsPTA2c"
		# getUserPostings(idToken)
		# deletePosting(idToken, postingId) # works
		# updatePosting(idToken, postingId)
		applyToPosting(idToken, postingId)


# signIn()
main()
