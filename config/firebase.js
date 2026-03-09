const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// Fix newline issue in private key
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://nj777-2756c-default-rtdb.firebaseio.com"
});

module.exports = admin;