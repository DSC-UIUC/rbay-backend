# Research Bay: Backend
You'll be focusing on what the user can't see! This involves working with Firebase, GCP, etc to build much of the supporting functionalities of the web app, including working with databases, API endpoints, and user authentication. This will be a serverless backend (i.e. lives on a cloud platform). This role will also involve fullstack work (i.e. connecting the frontend to the backend via a REST API over HTTP).

# Development Guidelines
https://docs.google.com/document/d/1PVu8dfr644QOT0tvP7jJsqVhcjgYlhtRrrXIWbIJWzE/edit?usp=sharing


# API Documentation

Once deployed the base url will be https://us-central1-research-bay.cloudfunctions.net.

## USERS

### GET /signIn
Takes in an email and password. Returns token and the user's entry in the users database.

Ex. '/signIn'

Example JSON Request Format:
```
{
	"email" : [string],
  "password" : [string]
}
```

Example JSON Return Format:
```
{
    "username": [string],
    "is_student": [boolean],
    "profile": [string],
    "postings": {
        "values": [string array]
    },
    "email": [string],
    "token": [string]
}
```

### POST /signUp
Creates and logs in user, given user information (e.g. email and password).

Ex. `/signUp`

Example JSON Request Format:
```
{
	"major" : "Computer Science",
	"email" : "testingemail@illinois.edu",
	"password": "hunter2",
	"name"  : "Test User",
	"year"  : 1,
	"is_student" : true,
  "experience" : {
    "skills" : ["MIPS Assembly", "x86 Assembly"]
  }
}
```

Example JSON Response Format:
```
{
    "token" : [string]
}
```

## USERS Client Endpoints

Send Requests with the current users idtoken. This only allows the current user to do CRUD operations on their own information based off the given idToken.

### GET /getuser
Gets the profile information of a given idToken using query param 'token'. Returns a json format of the stored profile information if the given user exists. Will return error if no token is given and if token does not work. The token is what the client receives once they login.

Ex. '/getuser?token=[idToken]'

Example JSON Return Format: ***NOTE*** May be changed
```
{
    "username": {
        "name": "[string]",
        "year": [int],
        "major": "[string]",
        "experience" : {
          "skills": [
              "[string]"
          ]
        }
    }
}
```

### POST /createuser
Creates the profile information that is given through the http request. Pass 'token' in body to indicate the idToken of the current user. Must pass parameters 'is_student', 'email', and 'username'. Will return error if given username already exists or there was error creating new profile.

For professors, set 'is_student' to false, and only the following parameters will be added to the profile: 'name', 'aboutme', 'coursework', 'research'.

For students, set 'is_student' to true, and only following parameters will be added to profile: 'name', 'aboutme', 'coursework', 'gpa', 'major', 'year', 'experience'.

Ex. `/createuser`

Example JSON body:
```
{
  "token" : [idToken],
  "username" : "t2",
	"major" : "CS",
	"email" : "test2@illinois.edu",
	"name"  : "test2",
	"year"  : 1,
	"is_student" : true,
	"experience" : {
      "skills" : [
          Coding", "Python
          ]
      }
}
```

### PUT /updateuser
Updates a profile given a query string 'token' and a json body. Same parameters as createuser but you will not be able to edit 'username' and 'is_student' parameters. Will return error if given token is not valid.

Ex. `/updateuser`

Exmaple JSON body:
```
{
  "token" : [idToken],
	"major" : "CS",
  "year"  : 2
}
```

### DELETE /deleteuser
Deletes a profile given the body param string 'token'. Will return error if token is not valid.

Ex. `/deleteuser`
Example JSON Body Format:
```
{
  "token" : [idToken]
}
```

## USERS Dev Endpoints

As of right now, dev endpoints have no way of verification.

### GET /devgetuser
Gets the profile information of a given username using query string 'username'. Requires a developer key given in the query. Returns a json format of the stored profile information if the given user exists. Will return error if no username is given and if username does not exist.

Ex. '/devgetuser?username=test2&developerKey=[developerToken]'

Example JSON Return Format: ***NOTE*** May be changed
```
{
    "username": {
        "name": "[string]",
        "year": [int],
        "major": "[string]",
        "skills": [
            "[string]"
        ]
    }
}
```

### POST /devcreateuser
Creates the profile information that is given through the http request. REQUIRES developerKey in body. Use the query string 'username' to indicate the username of profile. Also requires query string 'uid' to link the profile to a account. You can get the uid from authentication tab on the firebase console. Must pass parameters 'is_student', 'email', and 'username'. Will return error if given username already exists or there was error creating new profile.

For professors, set 'is_student' to false, and only the following parameters will be added to the profile: 'name', 'aboutme', 'coursework', 'research'.

For students, set 'is_student' to true, and only following parameters will be added to profile: 'name', 'aboutme', 'coursework', 'gpa', 'major', 'year', 'experience'.

Ex. `/devcreateuser?username=test2&uid=[userId]`

Example JSON body:
```
{
  "developerKey" : [developerKey],
  "username" : "t2",
  "major" : "CS",
  "email" : "test2@illinois.edu",
  "name"  : "test2",
  "year"  : 1,
  "is_student" : true,
  "experience" : {
      "skills" : [
          Coding", "Python
          ]
      }
}
```

### PUT /devupdateuser
Updates a profile given a query string 'username' and a json body. REQUIRES developerKey in body. Same parameters as createuser but you will not be able to edit 'username' and 'is_student' parameters. Will return error if given token is not valid.

Ex. `/devupdateuser?username=test2`

Exmaple JSON body:
```
{
  "developerKey" : [developerKey],
  "major" : "CS",
  "year"  : 3
}
```

### DELETE /devdeleteuser
Deletes a profile given the query string 'username'. REQUIRES developerKey in body. Will return error if username does not exist.

Ex. `/devdeleteuser?username=test2`
Example JSON Body Format:
```
{
  "devloperKey" : [developerKey]
}
```


## Student Profiles (old database)

### GET /student
Gets the profile information of the given student using query string 'name'. Will return json format of the stored profile information if the given student exists.

Ex. `/student?name=Bob Dylan`

Example JSON return format:

```
{
   "Coursework":{
      "subject" :[
         "course"
      ]
   },
   "Skills":{
      "Programming Languages":[
         "language"
      ],
      "Frameworks":[
         "framework"
      ]
   },
   "Research Interests":{
      "Research Area" : [
      		"specific topic"
      ]
   },
   "GPA": [int],
   "Year": [string],
   "About Me": [string]

}
```

### POST /student
Creates the profile information that is given through the http request. Use the query string 'name' to indicate the id of profile. Only parameters "GPA", "Year", "About Me", "Major", "Coursework", "Skills", and "Research Interests" will be added to the profile. Any other parameters will be ignored.

Ex. `/student?name=Bob Dylan`

Example JSON body:

```
{
   "Coursework":{
      "subject" :[
         "course"
      ]
   },
   "Skills":{
      "Programming Languages":[
         "language"
      ],
      "Frameworks":[
         "framework"
      ]
   },
   "Research Interests":{
      "Research Area" : [
      		"specific topic"
      ]
   },
   "GPA": [int],
   "Year": [string],
   "About Me": [string]

}
```

### PUT /student
Updates a profile given a query string 'name' and a json. Only the parameters "GPA", "Year", "About Me", "Major", "Coursework", "Skills", and "Research Interests" will be updated. Any other parameters will be ignored.

Ex. `/student?name=Bob Dylan`

Example JSON body:

```
{
   "Coursework":{
      "subject" :[
         "course"
      ]
   },
   "Skills":{
      "Programming Languages":[
         "language"
      ],
      "Frameworks":[
         "framework"
      ]
   },
   "Research Interests":{
      "Research Area" : [
      		"specific topic"
      ]
   },
   "GPA": [int],
   "Year": [string],
   "About Me": [string]

}
```

### DELETE /student
Deletes a profile given the query string 'name'.

Ex. `/student?name=Bob Dylan`

## Professor Profiles (old database)

### GET /professor
Gets the profile information of the given professor using query string 'name'. Will return json format of the stored profile information if the given professor exists.

Ex. `/professor?name=David Hoffman`

Example JSON return format:

```
{
    "David Hoffman": {
        "Job Posting 1": {
            post details
        },
        "Email": "dhoffman@gmail.com",
        "Bio": "I enjoy solving problems in high performance computing, compilers, and love to teach students about systems and programming design.",
        "Courses Taught": {
            "Computer Science": [
                "Software Design",
                "Data Structures",
                "Systems"
            ]
        },
        "Research Areas": {
            "Computer Science": [
                "Compilers",
                "Systems",
                "High Performance Computing",
                "Programming Design"
            ]
        }
    }
}
```

### POST /professor
Creates the profile information that is given through the http request. Use the query string 'name' to indicate the id of profile. Only parameters "Bio", "Courses Taught", "Email", and "Research Areas" will be added to the profile. Any other parameters will be ignored.

Ex. `/professor?name=Bob Dylan`

Example JSON body:

```
{
   "Courses Taught":{
      "subject" :[
         "course"
      ]
   },
   "Research Area":{
      "area" : [
      		"specific topic"
      ]
   },
   "Email": [string],
   "Bio": [string]

}
```

### PUT /professor
Updates a profile given a query string 'name' and a json. Only the parameters "Bio", "Courses Taught", "Email", and "Research Areas" will be updated. Any other parameters will be ignored.

Ex. `/professor?name=Bob Dylan`

Example JSON body:

```
{
   "Courses Taught":{
      "subject" :[
         "course"
      ]
   },
   "Research Area":{
      "area" : [
      		"specific topic"
      ]
   },
   "Email": [string],
   "Bio": [string]

}
```

### DELETE /professor
Deletes a profile given the query string 'name'.

Ex. `/professor?name=Bob Dylan`
