const admin = require("firebase-admin");

// Construct service account from environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID, // optional if you want
  private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FB_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FB_DATABASE_URL,
});

const db = admin.database();
module.exports = db;