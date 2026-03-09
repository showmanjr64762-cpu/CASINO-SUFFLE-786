const admin = require("firebase-admin");

if (!admin.apps.length) {

  if (!process.env.FIREBASE_KEY) {
    console.error("FIREBASE_KEY not found in environment variables");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: serviceAccount.databaseURL
  });

}

const db = admin.database();

module.exports = db;