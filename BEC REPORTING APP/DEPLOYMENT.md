# Production Deployment Guide

Follow this guide to securely deploy the BEC SRMS to a production environment.

## 1. Firebase Security (CRITICAL)

### A. Deploy Security Rules
You MUST apply the security rules to protect student data.
1. Go to the Firebase Console -> **Firestore Database** -> **Rules**.
2. Open the `firestore.rules` file in this repository.
3. Copy its entire contents and paste it into the Firebase Console. Click **Publish**.
4. Repeat this process for **Storage** using the `storage.rules` file.

### B. Secure the API Key
Because the Firebase Config is visible in `client/js/services/firebase.js`, you must restrict the API key so it can only be used by your production domain.
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Firebase project from the dropdown at the top.
3. Navigate to **APIs & Services** -> **Credentials**.
4. Click on the API Key named **"Browser key (auto created by Firebase)"**.
5. Under **Application restrictions**, select **HTTP referrers (web sites)**.
6. Click **Add an item** and enter your production domain (e.g., `*becbhubaneswar.com/*`).
7. Click **Save**. *It may take up to 5 minutes for restrictions to propagate.*

### C. Build Firestore Indexes
The Admin Dashboard uses advanced pagination that requires a composite index.
1. Log into the system as an Admin.
2. Navigate to the Admin Dashboard.
3. Open the Chrome DevTools Console (`F12`).
4. Click the "Next Page" button on the pagination controls.
5. In the console, you will see a Firebase error containing a direct link.
6. Click that link. It will open the Firebase Console and automatically prompt you to build the index for `linkedAt desc`.
7. Wait ~3 minutes for the index to build.

## 2. Server Deployment

The Node.js server (`server/app.js`) acts as both an API (for health checks) and a static file server for the frontend.

### Option A: Render / Heroku / DigitalOcean App Platform
1. Connect your GitHub repository to the PaaS provider.
2. Set the Root Directory to `/server`.
3. Set the Build Command to `npm install`.
4. Set the Start Command to `npm start` (or `node app.js`).
5. In the platform's Environment Variables section, configure:
   - `NODE_ENV = production`
   - `PORT = 5000` (or let the platform auto-assign)

### Option B: VPS (EC2, Droplet) with PM2 & Nginx
1. SSH into your server and clone the repository.
2. Install Node and PM2: `npm install -g pm2`.
3. Navigate to `server` and run `npm install`.
4. Start the app: `pm2 start app.js --name "bec-srms"`.
5. Configure Nginx as a reverse proxy forwarding port 80/443 to `localhost:5000`.
6. Secure the domain with an SSL certificate using Certbot: `sudo certbot --nginx`.

## 3. Backups

To ensure data safety, configure automated Firestore exports:
1. Go to Google Cloud Console -> **Cloud Scheduler**.
2. Create a job that triggers a Google Cloud Function to export Firestore data to a Google Cloud Storage bucket daily.
3. (Alternative): Use a 3rd party tool like Firefoo for manual periodic backups.
