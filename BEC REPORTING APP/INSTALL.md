# Installation & Development Guide

Follow these steps to run the BEC SRMS locally for development.

## Prerequisites
- **Node.js:** v18 or higher
- **npm:** v9 or higher
- **Firebase Project:** You must have a Firebase project created with Firestore, Storage, and Authentication enabled.

## 1. Clone the Repository
```bash
git clone https://github.com/bhagyabratagantayat/Bec-Reporting-Website.git
cd Bec-Reporting-Website
```

## 2. Server Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp ../.env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The backend server (and static file host) will run on `http://localhost:5000`.

## 3. Firebase Configuration
Because this is a Vanilla JavaScript frontend, you must configure your Firebase keys directly in the client configuration file.

1. Open `client/js/services/firebase.js`.
2. Locate the `firebaseConfig` object.
3. Replace the placeholder values with your actual Firebase Project config:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

## 4. Development Workflow
- **Frontend Changes:** Since the Node.js server statically serves the `client/` folder, any changes you make to the HTML/CSS/JS files will be immediately visible upon a browser refresh.
- **Security Rules:** If you modify `firestore.rules` or `storage.rules`, remember that they only apply to production. You must deploy them via the Firebase CLI or paste them into the Firebase Console.
