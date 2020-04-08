# Research Bay

// TODO about this project as a whole

## About Backend

This repository contains the code and documentation for Research Bay's Backend API, which handles all HTTP endpoints required to successfully run all user authentication, data, and actions for the Research Bay website (Frontend). This API was built on REST and Serverless principles and can function independently from any frontend interface. Thus, future expansions, such as a mobile app or additional GCP resources, may easily be integrated into this project. This REST API is implemented using Firebase's Authentication, Firestore, Storage, and Cloud Functions services in JavaScript (Node.js).

### Backend Team

The Research Bay project was built by student developers in Developer Student Club at the University of Illinois at Urbana-Champaign (DSC @ UIUC). DSC @ UIUC is an official branch of Google Developers' global Developer Student Club program. Specifically, this backend API was built by the following students in the DSC's 2019-2020 membership:

// TODO add links to developers' websites and/or email?

- [Keon Park](https://www.linkedin.com/in/parkkeo1/) - Lead Dev
- Thomas Yang - Dev
- Steven Pan - Dev
- Aditya Sriram - Dev
- Kavi Ravuri - Mentor

---

### Documentation

The rest of this README contains the documentation for all current API endpoints supported by Research Bay. These notes assume the reader already has existing development experience with REST/HTTP APIs. Feel free to contact Keon Park at keonp2@illinois.edu with any questions or concerns.

Please read the documentation in full before invoking any endpoints for development, testing, or use.

All endpoints have a base URL of https://us-central1-research-bay.cloudfunctions.net. Note that the endpoints use HTTPS to protect sensitive user information. Current endpoints are listed below:

[Authentication](#auth)
- [/signUp](#signup)
- [/signIn](#signin)
- [/checkToken](#checktoken)
- [/changePassword](#changepassword)
- [/deleteUser](#deleteuser)

[Profile](#profile)
- [/getProfile](#getprofile)
- [/setProfile](#setprofile)

[Posting](#posting)
- [/getUserPostings](#getuserpostings)
- [/getUserRecommendations](#getuserrecommendations)

// TODO add more

---

### Success and Error API responses


For all endpoints, the API returns a response with status code with 200 on successful invocations with a `messsage` and `data` field in the response body (JSON) as shown below:

```
{
  "message": "OK",
  "data": {...}
}
```

On failure, the API returns a 500 (internal server error) or 400 (bad request) response with only a `message` field in the body (JSON) as shown below:

```
{
  "message": "...",
}
```

The message contains the relevant error message that caused the failed invocation.

Given the information above, this API documentation only contains the format of the `data` field for a successful response (200) for each endpoint.

---

<a name="auth" id="auth"></a>
### Authentication

<br />

<a name="signup" id="signup"></a>
**POST /signUp**

Register new user for Research Bay. On successful sign up, the new user is logged in via Firebase Auth and returned a temporary session token, `idToken`, which is required by API endpoints that require user authentication.

Request Body (JSON):
```
{
  "email" : [string],
  "password" : [string],
  "is_student": [boolean],
  "username": [string]
}
```

All fields are required. `is_student` indicates whether the user will be a student or professor. `username` and `email` must be unique (i.e. another user cannot already be registered with the same values).

Response Body `data` (200):
```
"data": {
  "idToken" : [string],
  "username" : [string],
  "is_student": [boolean]
}
```

`idToken` is a temporary session token generated by Firebase that is valid for 1 hour. After it expires, the user must re-authenticate. To check whether a token is valid, please see [/checkToken](#checktoken).


<a name="signin" id="signin"></a>
**POST /signIn**

Log in existing user into Research Bay. On successful sign in, the user is logged in via Firebase Auth and returned a temporary session token, `idToken`, which is required by API endpoints that require user authentication.

Request Body (JSON):
```
{
  "email" : [string],
  "password" : [string]
}
```

All fields are required.

Response Body `data` (200):
```
"data": {
  "idToken" : [string],
  "username" : [string],
  "is_student": [boolean]
}
```

`idToken` is a temporary session token generated by Firebase that is valid for 1 hour. After it expires, the user must re-authenticate. To check whether a token is valid, please see [/checkToken](#checktoken).


<a name="checktoken" id="checktoken"></a>
**GET /checkToken**

Checks whether a token is a currently valid `idToken` issued by Firebase Auth. This endpoint is typically used to persist authentication between sessions in the Research Bay frontend.

Request Query (URL encoded parameters):
```
/checkToken?idToken=[string]
```

`idToken` is required.

Response Body `data` (200):
```
"data": {
  "idToken" : [string]
}
```

The returned valid `idToken` is not refreshed by Firebase Auth and will still expire in its original expiration time from when it was first issued.

<a name="changepassword" id="changepassword"></a>
**POST /changePassword**

// TODO please follow the exact format of the docs above

<a name="deleteuser" id="deleteuser"></a>
**DELETE /deleteUser**

// TODO please follow the exact format of the docs above

---

<a name="profile" id="profile"></a>
### Profile

<br />

<a name="getprofile" id="getprofile"></a>
**GET /getProfile**

Retrieves all stored profile data for an existing user using his/her valid `idToken`. If `idToken` is invalid or expired, this call fails. The fields in the returned data depends on whether the user is a student or professor.

Request Query (URL encoded parameters):
```
/getProfile?idToken=[string]
```

`idToken` is required.

Response Body `data` (200):

For student user:
```
"data": {
  "aboutme" : [string],
  "gpa": [float],
  "major": [string],
  "name": [string],
  "research interests": [string array],
  "coursework": [string array],
  "skills": [string array],
  "experience": [
    {
      "title": [string],
      "company": [string],
      "description": [string]
    },
    {...}
  ]
}
```

For professor user:
```
"data": {
  "aboutme" : [string],
  "name": [string],
  "coursework": [string array],
  "research interests": [string array]
}
```


<a name="setprofile" id="setprofile"></a>
**POST /setProfile**

// TODO please follow the exact format of the docs above

---

<a name="posting" id="posting"></a>
### Posting

<br />

<a name="getuserpostings" id="getuserpostings"></a>
**GET /getUserPostings**

// TODO please follow the exact format of the docs above

<a name="getuserrecommendations" id="getuserrecommendations"></a>
**GET /getUserRecommendations**

// TODO please follow the exact format of the docs above

---

// TODO add more
