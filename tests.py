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
	url = "https://us-central1-research-bay.cloudfunctions.net/deleteUser"

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

	# major and gpa don't seem to work
	body = {
		"idToken":idToken,
		"aboutme":"I'm actually pretty awesome",
		"gpa":5,
		"major":"awesome science",
		"name":"Narcissist",
		"year":2,
		"experience":"A lot",
		"research interests":["I", "Me", "Myself"],
		"coursework":"Self studies"
	}

	url = "https://us-central1-research-bay.cloudfunctions.net/setProfile"

	res = rq.post(url, data=body)
	print(res.text)

def main():
	print("Starting Tests")

	res1 = signIn().json()
	idToken = res1['data']['idToken']

	# setProfile(idToken)

	getProfile(idToken)

	# deleteAcc(res1['data']['idToken'])






# signIn()
main()