// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/firebase");

// Get all players
router.get("/players", async (req, res) => {
  try {
    const snapshot = await db.ref("players").once("value");
    const players = snapshot.val() || {};
    res.json(players);
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// Add coins
router.post("/addCoins", async (req, res) => {
  const { playerId, amount } = req.body;

  if (!playerId || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Invalid playerId or amount" });
  }

  try {
    const ref = db.ref(`players/${playerId}`);
    const snapshot = await ref.once("value");
    const player = snapshot.val();

    if (!player) return res.status(404).json({ error: "Player not found" });

    player.coins += amount;

    await ref.set(player);

    res.json({ success: true, coins: player.coins });
  } catch (err) {
    console.error("Error adding coins:", err);
    res.status(500).json({ error: "Failed to add coins" });
  }
});

// Remove coins
router.post("/removeCoins", async (req, res) => {
  const { playerId, amount } = req.body;

  if (!playerId || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Invalid playerId or amount" });
  }

  try {
    const ref = db.ref(`players/${playerId}`);
    const snapshot = await ref.once("value");
    const player = snapshot.val();

    if (!player) return res.status(404).json({ error: "Player not found" });

    player.coins -= amount;
    if (player.coins < 0) player.coins = 0; // prevent negative coins

    await ref.set(player);

    res.json({ success: true, coins: player.coins });
  } catch (err) {
    console.error("Error removing coins:", err);
    res.status(500).json({ error: "Failed to remove coins" });
  }
});

module.exports = router;