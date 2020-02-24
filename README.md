# Research Bay: Backend
You'll be focusing on what the user can't see! This involves working with Firebase, GCP, etc to build much of the supporting functionalities of the web app, including working with databases, API endpoints, and user authentication. This will be a serverless backend (i.e. lives on a cloud platform). This role will also involve fullstack work (i.e. connecting the frontend to the backend via a REST API over HTTP).

# Development Guidelines
https://docs.google.com/document/d/1PVu8dfr644QOT0tvP7jJsqVhcjgYlhtRrrXIWbIJWzE/edit?usp=sharing


# API Documentation

Once deployed the base url will be https://us-central1-research-bay.cloudfunctions.net.

## Student Profiles

### GET /student
Gets the profile information of the given student using query string 'name'. Will return json format of the stored profile information if the given student exists.
Ex. `/student?name=Bob Dylan`

### POST /student
Creates the profile information that is given through the http request. Use the query string 'name' to indicate the id of profile. Only parameters "GPA", "Year", "About Me", "Major", "Coursework", "Skills", and "Research Interests" will be added to the profile. Any other parameters will be ignored.

### PUT /student
Updates a profile given a query string 'name' and a json. Only the parameters "GPA", "Year", "About Me", "Major", "Coursework", "Skills", and "Research Interests" will be updated. Any other parameters will be ignored.

### DELETE /student
Deletes a profile given the query string 'name'.

## Professor Profiles

### GET /professor
Gets the profile information of the given professor using query string 'name'. Will return json format of the stored profile information if the given professor exists.
Ex. `/professor?name=David Hoffman`

### POST /professor
Creates the profile information that is given through the http request. Use the query string 'name' to indicate the id of profile. Only parameters "Bio", "Courses Taught", "Email", and "Research Areas" will be added to the profile. Any other parameters will be ignored.

### PUT /professor
Updates a profile given a query string 'name' and a json. Only the parameters "Bio", "Courses Taught", "Email", and "Research Areas" will be updated. Any other parameters will be ignored.

### DELETE /professor
Deletes a profile given the query string 'name'.