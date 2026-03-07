const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FB_PROJECT_ID,
    clientEmail: process.env.FB_CLIENT_EMAIL,
    privateKey: process.env.FB_PRIVATE_KEY
      ? process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined
  }),
  databaseURL: "https://nj777-2756c-default-rtdb.firebaseio.com"
});

const db = admin.database();

module.exports = db;