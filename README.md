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


## Professor Profiles

### GET /professor
Gets the profile information of the given professor using query string 'name'. Will return json format of the stored profile information if the given professor exists.
Ex. `/professor?name=David Hoffman`