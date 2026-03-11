const db = require("./config/firebase");

async function test() {
  try {
    const snapshot = await db.ref("players").once("value");
    console.log("Firebase Connected!");
    console.log(snapshot.val());
  } catch (err) {
    console.error("Firebase Error:", err);
  }
}

test();