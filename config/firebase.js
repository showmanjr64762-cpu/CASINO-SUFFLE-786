require("dotenv").config();

const admin = require("firebase-admin");

const privateKey = process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n");

const serviceAccount = {
  project_id: process.env.FB_PROJECT_ID,
  private_key: privateKey,
  client_email: process.env.FB_CLIENT_EMAIL
};


 

const admin = require("firebase-admin");

const serviceAccount = require("../firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nj777-2756c-default-rtdb.firebaseio.com"
});

module.exports = admin;
const db = admin.database();

module.exports = db;