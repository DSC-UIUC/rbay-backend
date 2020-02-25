# Research Bay: Backend
You'll be focusing on what the user can't see! This involves working with Firebase, GCP, etc to build much of the supporting functionalities of the web app, including working with databases, API endpoints, and user authentication. This will be a serverless backend (i.e. lives on a cloud platform). This role will also involve fullstack work (i.e. connecting the frontend to the backend via a REST API over HTTP).

# Development Guidelines
https://docs.google.com/document/d/1PVu8dfr644QOT0tvP7jJsqVhcjgYlhtRrrXIWbIJWzE/edit?usp=sharing


# API Documentation

Once deployed the base url will be https://us-central1-research-bay.cloudfunctions.net.

## USERS

### GET /signIn
Verifies a login token returns the entry in the users database of the user that the token corresponds to.

Ex. '/signIn?token=[token]'

Example JSON Return Format:
```
{
    "username": [string],
    "is_student": [boolean],
    "profile": [string]",
    "postings": {
        "values": [string array]
    },
    "email": [string]
}
```

### POST /signUp
Creates user, given an email and password.

Ex. `/user?=test2`

Example JSON Request Format:
```
{
	"major" : "Computer Science",
	"email" : "testingemail@illinois.edu",
	"password": "hunter2",
	"name"  : "Test User",
	"year"  : 1,
	"is_student" : true,
	"skills" : ["MIPS Assembly", "x86 Assembly"]
}
```

Example JSON Response Format:
```
{
    "success": "[userID] created succesfully"
}
```
