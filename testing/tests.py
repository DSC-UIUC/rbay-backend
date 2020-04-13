import requests as rq
import json

def signUp():
	print("Signing up")

	body = json.dumps({
		"email":"test123@test.com",
		"password":"test1234",
		"is_student":True,
		"username":"pytest_one"
	})

	response = rq.post("https://us-central1-research-bay.cloudfunctions.net/signUp", data=body)

	print(response.text)

def signIn():
	print("Signing in")

	url = "https://us-central1-research-bay.cloudfunctions.net/signIn"

	body = {
		"email":"test123@test.com",
		"password":"test1234",
	}

	res = rq.post(url, data=body)
	print(res.json())
	return res

def deleteAcc(idToken):
	print("Deleting")

	body = {"idToken":idToken}
	url = "https://us-central1-research-bay.cloudfunctions.net/deleteuser"

	res = rq.delete(url, data=body)
	print(res.text)

def getProfile(idToken):
	print("Getting profile")

	body = {"idToken":idToken}
	url = "https://us-central1-research-bay.cloudfunctions.net/getProfile"

	res = rq.get(url, data=body)
	print(res.text)

def setProfile(idToken):
	print("Setting Profile")

	body = {
		"idToken":idToken,
		"aboutMe":"I'm actually pretty awesome",
		"gpa":5,
		"major":"awesome science",
		"namw":"Narci",
		"year":2
	}
	url = "https://us-central1-research-bay.cloudfunctions.net/setProfile"

	res = rq.post(url, data=body)
	print(res.text)

def main():
	print("Sign in and delete")
	res1 = signIn().json()
	idToken = res1['data']['idToken']
	setProfile(idToken)
	# deleteAcc(res1['data']['idToken'])






# signIn()
main()