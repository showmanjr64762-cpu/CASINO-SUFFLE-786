// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/firebase");

// GET all players
router.get("/players", async (req, res) => {
  try {
    const snapshot = await db.ref("players").once("value");
    const players = snapshot.val() || {};
    res.json(players);
  } catch (err) {
    console.error("Failed to fetch players:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// POST add coins to a player
router.post("/add-coins", async (req, res) => {
  const { playerId, coins } = req.body;
  try {
    const playerRef = db.ref("players/" + playerId);
    const snapshot = await playerRef.once("value");
    const player = snapshot.val();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const newCoins = (player.coins || 0) + Number(coins);
    await playerRef.update({ coins: newCoins });
    res.json({ success: true, newCoins });
  } catch (err) {
    console.error("Failed to add coins:", err);
    res.status(500).json({ error: "Failed to add coins" });
  }
});

// Optional: add a test player
router.get("/add-test-player", async (req, res) => {
  try {
    const ref = db.ref("players").push();
    await ref.set({ name: "Test Player", coins: 1000 });
    res.send("Test player added");
  } catch (err) {
    console.error("Failed to add test player:", err);
    res.status(500).send("Failed to add test player");
  }
});

module.exports = router;