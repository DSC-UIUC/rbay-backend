<br />
<p align="center">
  <a href="https://github.com/DSC-UIUC/research-bay">
    <img src="https://github.com/DSC-UIUC/research-bay/blob/master/images/rbay_logo_long.png?raw=true" alt="Logo">
  </a>

  <h3 align="center">:mag_right: Research Bay <strong>Backend</strong></h3>

  <p align="center">
    A web platform for efficiently connecting students to research opportunities and professors
    <br />
    <a href="https://research-bay.web.app"><strong><< Live Website >></strong></a>
    <br />
    <br />
    Repository Links
    <br />
    <a href="https://github.com/DSC-UIUC/research-bay">Main</a>
    ·
    <a href="https://github.com/DSC-UIUC/rbay-frontend">Frontend</a>
    ·
    <a href="https://github.com/DSC-UIUC/rbay-backend">Backend</a>
    ·
    <a href="https://github.com/DSC-UIUC/rbay-data-ml">Data/ML</a>
  </p>
</p>

## Table of Contents

* [About Backend](#about-backend)
  * [DSC at UIUC](#dsc-at-uiuc)
* [Getting Started](#getting-started)
* [Documentation](#documentation)

## About Backend

This repository contains the code and documentation for Research Bay's Backend, which handles all HTTP API endpoints required to successfully run all user authentication, data, and actions for the Research Bay platform. This API was built on REST and Serverless principles and can function independently from any frontend interface.

More information about Research Bay as an entire project is available at the [main repository](https://github.com/DSC-UIUC/research-bay).

### DSC at UIUC

The Research Bay project is built and maintained by student developers in Developer Student Club at the University of Illinois at Urbana-Champaign (DSC at UIUC) during the 2019-2020 school year. DSC at UIUC is an official branch of Google Developers' global [Developer Student Club program](https://developers.google.com/community/dsc).

## Getting Started

Please refer to the Research Bay general setup guide [here](https://github.com/DSC-UIUC/research-bay/blob/master/README.md#getting-started).

## Documentation

The rest of this README contains the documentation for all current API endpoints supported by Research Bay. These notes assume the reader already has existing development experience with REST/HTTP APIs. Feel free to contact the Research Bay team at dscuiuc2@gmail.com with any questions or concerns.

Please read the documentation in full before invoking any endpoints for development, testing, or use.

All endpoints have a base URL of https://us-central1-research-bay.cloudfunctions.net. Note that the endpoints use HTTPS to protect sensitive user information. Current endpoints are listed below. Cloud functions that use DB or other event triggers are not included in this list.

[Authentication](#auth)
- [/signUp](#signup)
- [/signIn](#signin)
- [/checkToken](#checktoken)
- [/changePassword](#changepassword)
- [/deleteUser](#deleteuser)

[Profile](#profile)
- [/getProfile](#getprofile)
- [/getProfileById](#getprofilebyid)
- [/setProfile](#setprofile)
- [/getProfileFileSignedUrl](#getprofilefilesignedurl)

[Posting](#posting)
- [/getUserPostings](#getuserpostings)
- [/getPostingById](#getPostingById)
- [/createPosting](#createPosting)
- [/applyToPosting](#applyToPosting)
- [/updatePosting](#updatePosting)
- [/selectApplicantForPosting (depreciated)](#selectapplicantforposting)
- [/closePosting (depreciated)](#closePosting)
- [/deletePosting](#deletePosting)

[Search & Recommendations](#searchandrecommendations)
- [/getUserRecommendations](#getuserrecommendations)
- [/getSearch](#getsearch)

[Misc](#misc)
- [/getConfig](#getconfig)


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
  "is_student": [boolean],
  "expirationTimestamp": [int],
  "email" : [string]
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
  "is_student": [boolean],
  "expirationTimestamp": [int],
  "email" : [string]
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

Changes the password for the current user using their valid `idToken`. If `idToken` is invalid or expired, this call fails. If a given password is invalid, this endpoint will return a helpful error message about it (i.e. The password must be a string with at least 6 characters).

Request Body (JSON):
```
{
  "idToken" : [string],
  "password" : [string]
}
```

All fields are required.

Response Body `data` (200):
```
"data": "Password updated."
```

<a name="deleteuser" id="deleteuser"></a>
**DELETE /deleteUser**

Deletes the current user using their valid `idToken`. If `idToken` is invalid or expired, this call fails. This endpoint will delete all the user's information that is correctly stored.

Request Query (URL encoded parameters):
```
/deleteProfile?idToken=[string]
```

`idToken` is required.

Response Body `data` (200):
```
"data": {}
```

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
  "about_me" : [string],
  "picture": [string],
  "year" : [int],
  "gpa": [float],
  "major": [string],
  "name": [string],
  "research_interests": [string array],
  "coursework": [string array],
  "skills": [string array],
  "website" : [string],
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
  "about_me" : [string],
  "website" : [string],
  "name": [string],
  "picture": [string],
  "coursework": [string array],
  "research_interests": [string array]
}
```

<a name="getprofilebyid" id="getprofilebyid"></a>
**GET /getProfileById**

Retrieves all stored profile data for an existing user using a given `uid`. If `uid` is invalid, this call fails. The fields in the returned data depends on whether the user is a student or professor.

Request Query (URL encoded parameters):
```
/getProfile?uid=[string]
```

`uid` is required.

Response Body `data` (200):

For student user:
```
"data": {
  "about_me" : [string],
  "gpa": [float],
  "year" : [int],
  "major": [string],
  "name": [string],
  "research_interests": [string array],
  "coursework": [string array],
  "skills": [string array],
  "website" : [string],
  "picture": [string],
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
  "about_me" : [string],
  "website" : [string],
  "name": [string],
  "picture": [string],
  "coursework": [string array],
  "research_interests": [string array]
}
```

<a name="setprofile" id="setprofile"></a>
**POST /setProfile**

Updates the current user's profile with the given profile data using their valid `idToken`. If `idToken` is invalid or expired, this call fails. The parameters that will be updated depend on whether the user is a student or a professor. On sucess, this endpoint will return the updated profile in the same format as [/getProfile](#getprofile) endpoint.

Each profile parameter will be optional in the request body. Year will be an integer 1-5, meaning Freshmen-Graduate. Major will be array of strings in case of multiple majors.

Request Body (JSON):
```
{
  "idToken" : [string],
  profileFields...
}
```

`idToken` is required.

Response Body `data` (200):

For student user:
```
  "about_me" : [string],
  "year" : [int],
  "gpa": [float],
  "major": [string],
  "name": [string],
  "research_interests": [string array],
  "coursework": [string array],
  "skills": [string array],
  "website" : [string],
  "picture": [string],
  "experience": [
    {
      "title": [string],
      "company": [string],
      "description": [string]
    },
    {...}
  ]
```

For professor user:
```
  "about_me" : [string],
  "website" : [string],
  "name": [string],
  "coursework": [string array],
  "picture": [string],
  "research_interests": [string array]
```

<a name="getprofilefilesignedurl" id="getprofilefilesignedurl"></a>
**POST /getProfileFileSignedUrl**

Generates and returns a signed URL that can be used to store a user's file with `name` (i.e. a profile picture or resume) to a location in Firebase Cloud Storage, depending on the file's `type`. 

After receiving the signed URL, the client must send a PUT request to this URL with the file `Blob` or `File` object as the data to actually upload the file to Cloud Storage.

Request Body (JSON):
```
{
  "idToken" : [string],
  "type": [string], // can be "resume" or "picture"
  "contentType": [string], // ex. application/pdf, image/*, etc
  "name": [string], 
}
```

All fields are required.

Response Body `data` (200):
```
"data": [string array] // data[0] contains the signed URL
```

---

<a name="posting" id="posting"></a>
### Posting

<br />

<a name="getuserpostings" id="getuserpostings"></a>
**GET /getUserPostings**

Retrieves all the postings that a current user has created or applied to using their valid `idToken`. If `idToken` is invalid or expired, this call fails. If the current user is a professor, they will receive information about the applicants. If the user is a student, they will not receive any information about the applicants.

Request Query (URL encoded parameters):
```
/getUserPostings?idToken=[string]
```

`idToken` is required.

Response Body `data` (200):

```
"data" : [
   {
    "lab_name"            : [string],
    "professor"           : [string],
    "professor_id"        : [string],
    "title"               : [string],
    "description"         : [string],
    "is_open"             : [boolean],
    "requirements"        : {...},
    "tags"                : [string array],
    "applicants"          : [
        {
          "is_selected" : [boolean],
          "name"        : [string],
          "year"        : [int],
          "major"       : [string],
          "id"          : [string]
        },
        {...}
      ]
   },
   {...}
]
```

<a name="getPostingById" id="getPostingById"></a>
**GET /getPostingById**

Retrieves posting. If the user making this request is different from the original poster, the response body will not contain the list of applicants.

Request Query (URL encoded parameters):
```
/getPostingById?idToken=[string]&postingId=[string]
```

`idToken` and `postingId` are required.

Response Body `data` (200):

```
"data" : {
    "requirements": {
        "gpa": [float],
        "year": [string],
        "major": [array of strings],
        "coursework": [array of strings]
    },
    "professor": [reference],
    "tags": [array of strings],
    "title": [string],
    "lab_name": [string],
    "description": [string],
    "applicants" : [array of references (only appears if original poster is one making request)]
}
```

<a name="createPosting" id="createPosting"></a>
**POST /createPosting**

Creates a posting. Can only be used by users with professor status.

Request body (JSON):
```
{
  "idToken" : [string]
  "tags": [array of strings],
  "title": [string],
  "lab_name": [string],
  "description": [string],
  "professor_name": [string]
  "requirements": {
    "gpa": [float],
    "year": [string],
    "major": [array of strings],
    "coursework": [array of strings]
  }
}
```

`title`, `tags`, `description`, `professor_name`, and `lab_name` are required.

Response Body `data` (200):

```
"data" : {
        "id": [string]
    }
```

<a name="applyToPosting" id="applyToPosting"></a>
**POST /applyToPosting**

Adds student to list of applicants for a posting. Returns bad request if student has already applied to posting. Only students can apply to postings.

Request Body (JSON):
```
{
  "postingId": [string],
  "idToken": [string]
}
```

`idToken` and `postingId` are required.

Response Body `data` (200):

```
"data" : {
        "Success": [string]
    }
```

<a name="updatePosting" id="updatePosting"></a>

**POST /updatePosting**

Changes posting to contain values that are in the request body. Users can only update their own postings. Returns bad request if any applicant object contains an invalid id (i.e. the id field does not correspond to the UID of an existing user) or if request doesn't attempt to update any fields.

Request body (JSON):
```
{
  "idToken" : [string],
  "postingId" : [string],
  "tags": [array of strings],
  "title": [string],
  "lab_name": [string],
  "description": [string],
  "is_open" : [boolean],
  "applicants" : [array of applicant objects],
  "requirements": {
    "gpa": [float],
    "year": [string],
    "major": [array of strings],
    "coursework": [array of strings]
  }
}
```

Applicant objects follow this format:

```
{
  "id" : [string],
  "is_selected": [boolean]
}
```

`idToken`, `postingId`, and at least one of the other fields shown above are required.

Response Body `data` (200):
```
"data" : {
    "id" : [string]
}
```

<a name="selectapplicantforposting" id="selectapplicantforposting"></a>
**POST /selectApplicantForPosting (depreciated)**

Selects an applicant for the given posting created by the user with their valid `idToken`. If `idToken` is invalid or expired, this call fails. Given applicant must have applied for the posting and the posting must still be open. This endpoint will NOT close the posting. This will move the applicant from the postings applicants field to selected_applicants field.

Request Body (JSON):

```
{
  "idToken" : [string],
  "postingId" : [string],
  "applicant" : [string] // the applicant's uid
}
```

All fields are required.

Response Body `data` (200):
```
"data" : "Applicant successfully selected"
```

<a name="closePosting" id="closePosting"></a>
**POST /closePosting (depreciated)**

Sets the `is_open` field of the posting with the specified ID to false. Professors are only able to close their own postings.

Request Body (JSON):
```
{
  "postingId": [string],
  "idToken": [string]
}
```
`postingId` and `idToken` are required fields.

Response Body `data` (200):
```
"data" : {
        "id": [string]
    }
```

<a name="deletePosting" id="deletePosting"></a>
**DELETE /deletePosting**

Deletes posting, removing all references to the posting document in the users database. Only the user that created a given posting can delete it.

Request Query (URL encoded parameters):
```
/deletePosting?idToken=[string]&postingId=[string]
```

`idToken` and `postingId` are required.

Response Body `data` (200):

```
"data" : {
        "Success": [string]
    }
```

---

<a name="searchandrecommendations" id="searchandrecommendations"></a>
### Search & Recommendations

<br />

<a name="getuserrecommendations" id="getuserrecommendations"></a>
**GET /getUserRecommendations**

Retrieves all the recommended postings and profiles that has been generated using their valid `idToken`. If `idToken` is invalid or expired, this call fails. Posting object will be in the same format as [/getUserPostings](#getuserpostings). Profile object will be in the same format as [/getProfile](#getprofile).

Request Query (URL encoded parameters):
```
/getSearchPostings?idToken=[string]
```

`idToken` is required.

Response Body `data` (200):

```
"data" : [
  {
    "data" : {
      "postings" : [
          {
            "lab_name"            : [string],
            "professor"           : [string],
            "professor_id"        : [string],
            "title"               : [string],
            "description"         : [string],
            "is_open"             : [boolean],
            "requirements"        : {...},
            "tags"                : [string array]
          },
          {...}
        ],
      "profiles" : [  // fields will change depending on if profile is a teacher or student
          {
            "about_me" : [string],
            "picture": [string],
            "year" : [int],
            "gpa": [float],
            "major": [string],
            "name": [string],
            "research_interests": [string array],
            "coursework": [string array],
            "skills": [string array],
            "website" : [string],
            "experience": [
              {
                "title": [string],
                "company": [string],
                "description": [string]
              }
          },
          {...}
        ]
  }
]

```

<a name="getsearch" id="getsearch"></a>
**GET /getSearch**

Retrieves all the postings and profiles that a current user has searched to using their valid `idToken`. If `idToken` is invalid or expired, this call fails. 

Request Query (URL encoded parameters):
```
/getSearch?idToken=[string]&searchQuery=[string]
```

`idToken` and `searchQuery` is required.

Response Body `data` (200):

```
"data" : {
    "postings" : [
      {
        "id"            : [string],
        "description"   : [string],
        "is_open"       : [boolean],
        "lab_name"      : [string],
        "professor"     : [string],
        "requirements"  : {...},
        "title"         : [string],
        "tags"          : [string array]
      },
      {...}
    ],
    "profiles" : [
      {
        "id"            : [string],
        "name"          : [string],
        "year"          : [int],
        "major"         : [string],
        "about_me"      : [string],
        "picture"       : [string]
      },
      {...}
    ]
}
```

---

<a name="misc" id="misc"></a>
### Misc

<br />

<a name="getconfig" id="getconfig"></a>
**GET /getConfig**

Used by the React.js frontend web app to load in configuration data from the backend's `rbay_config.json` in the Cloud Storage's default bucket.

Request:
```
/getConfig
```

Response Body `data` (200):

```
"data" : {
        "majors": [string array], // ["ACES Undeclared", "Accountancy", "Acting", ...]
        "years": [string array], // [..., "Junior", "Senior", "Graduate"]
    }
```
