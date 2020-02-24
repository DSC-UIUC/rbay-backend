# Research Bay: Backend
You'll be focusing on what the user can't see! This involves working with Firebase, GCP, etc to build much of the supporting functionalities of the web app, including working with databases, API endpoints, and user authentication. This will be a serverless backend (i.e. lives on a cloud platform). This role will also involve fullstack work (i.e. connecting the frontend to the backend via a REST API over HTTP).

# Development Guidelines
https://docs.google.com/document/d/1PVu8dfr644QOT0tvP7jJsqVhcjgYlhtRrrXIWbIJWzE/edit?usp=sharing


# API Documentation

Once deployed the base url will be https://us-central1-research-bay.cloudfunctions.net.

## USERS

### GET /user
Gets the profile information of a given username using query string 'username'. Returns a json format of the stored profile information if the given user exists. Will return error if no username is given and if username does not exist.

Ex. '/user?username=test2'

Example JSON Return Format:
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

### POST /user
Creates the profile information that is given through the http request. Use the query string 'username' to indicate the username of profile. Only parameters "email", "is_student", "major", "skills", "year", and "name" are added to the profile. If any of the following parameters are missing, they will be set to null in the database. "posting" will be set to an empty array. Will return error if given username already exists or there was error creating new profile.

Ex. `/user?username=test2`

Example JSON body:
```
{
	"major" : "CS",
	"email" : "test2@illinois.edu",
	"name"  : "test2",
	"year"  : 1,
	"is_student" : true,
	"skills" : ["Coding", "Python"]
}
```

### PUT /user
Updates a profile given a query string 'username' and a json body. Only the parameters "major", "skills", "year", "name" will be updated. Any other parameters will be ignored. Will return error if given username does not exist.

Ex. `/user?username=test2`

Exmaple JSON body:
```
{
	"major" : "CS",
	"skills" : ["Coding", "Python", "Java"]
}
```

### DELETE /user
Deletes a profile given the query string 'username'. Will return error if username does not exist.

Ex. `/user?username=test2`

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
