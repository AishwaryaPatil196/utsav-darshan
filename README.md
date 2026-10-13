# Utsav Darshan – City Festival & Cultural Calendar Platform

## About the Project
Utsav Darshan is a web-based platform that helps users discover festivals and cultural events happening in different cities.

## Features
- Browse approved festivals and cultural events.
- Search festivals by name.
- Filter festivals by city and category.
- View festival dates, locations, descriptions, and significance.
- Save favorite festivals.
- Submit festival details for review.
- Admin login and dashboard.
- Approve, reject, or return festival submissions to pending status.

## Technologies Used
- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** JSON Web Token (JWT)

## Project Structure
- `client/` – Frontend application
- `server/` – Backend API and database setup

## How to Run the Project

### Start the backend
```bash
cd server
npm install
node server.js
```

### Start the frontend
Open another terminal:
```bash
cd client
npm install
npm run dev
```

Open the local URL displayed in the frontend terminal, usually `http://localhost:5173`.

## Security
Do not upload `.env` files, passwords, JWT secrets, database files, or `node_modules` to GitHub.

## Objective
To provide a convenient way for people to discover local festivals and cultural events through a searchable web platform.
