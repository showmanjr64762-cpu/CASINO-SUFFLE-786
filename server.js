require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");


// ======================
// Create App & Server
// ======================

const app = express();
const server = http.createServer(app);

const adminRoutes = require("./routes/adminRoutes");

app.use("/admin-api", adminRoutes);

// ======================
// Middlewares
// ======================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ======================
// Firebase Admin Setup
// ======================

// ======================
// Helper Functions
// ======================

async function addPlayer(player) {
  const ref = db.ref("players");
  const newRef = ref.push();
  await newRef.set(player);
  return newRef.key;
}

async function getPlayers() {
  const snapshot = await db.ref("players").once("value");
  return snapshot.val() || {};
}

// ======================
// Routes
// ======================

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Admin Login Page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

// Admin Dashboard (after login)
app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

// Admin Login API
app.post("/admin-login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// Get Players
app.get("/admin/players", async (req, res) => {
  try {
    const players = await getPlayers();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// Add Test Player
app.get("/add-test-player", async (req, res) => {
  try {
    const player = { name: "Test Player", coins: 1000 };
    await addPlayer(player);
    res.send("Test player added");
  } catch (error) {
    res.status(500).send("Error adding test player");
  }
});

// Game Routes
const gameRoutes = require("./routes/gameRoutes");
app.use("/game", gameRoutes);

// ======================
// Socket.IO
// ======================

const io = new Server(server, {
  cors: { origin: "*" }
});

const gameSocket = require("./sockets/gameSocket");

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("joinGame", (data) => {
    io.emit("adminUpdate", {
      action: "join",
      player: data.name
    });
  });

  socket.on("spin", (data) => {
    io.emit("adminUpdate", {
      action: "spin",
      player: data.name,
      result: data.result
    });
  });

  socket.on("disconnect", () => {
    io.emit("adminUpdate", {
      action: "leave",
      playerId: socket.id
    });
  });
});

// ======================
// Start Server
// ======================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});