// routes/gameRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/firebase"); // Import initialized db

if (!db) {
  throw new Error("Firebase DB not initialized. Check firebase.js and environment variables.");
}

// Join game
router.post("/join", async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ success: false, error: "Invalid player name" });
  }

  try {
    const ref = db.ref("players");
    const newPlayer = ref.push();
    await newPlayer.set({ name, coins: 1000 });

    res.json({ success: true, id: newPlayer.key });
  } catch (err) {
    console.error("Error joining game:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Spin route
router.post("/spin", async (req, res) => {
  const { playerId, bet } = req.body;

  if (!playerId || typeof bet !== "number") {
    return res.status(400).json({ message: "Invalid playerId or bet" });
  }

  try {
    const playerRef = db.ref(`players/${playerId}`);
    const snapshot = await playerRef.once("value");
    const player = snapshot.val();

    if (!player) return res.status(404).json({ message: "Player not found" });
    if (player.coins < bet) return res.status(400).json({ message: "Not enough coins" });

    player.coins -= bet;
    const win = Math.random() < 0.3;
    if (win) player.coins += bet * 2;

    await playerRef.set(player);
    res.json({ win, coins: player.coins });
  } catch (err) {
    console.error("Error spinning:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;