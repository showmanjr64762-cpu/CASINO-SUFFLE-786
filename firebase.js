const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

let onlineUsers = {};
let recentWins = [];
let livePlayers = [];

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  // Send current online count to new user
  socket.emit('online-count', Object.keys(onlineUsers).length);
  socket.emit('recent-winners', recentWins);
  socket.emit('live-players', livePlayers);

  // User comes online
  socket.on('user-online', (data) => {
    onlineUsers[socket.id] = {
      userId: data.userId,
      username: data.username,
      status: 'online',
      joinedAt: new Date().toISOString()
    };
    
    livePlayers = Object.values(onlineUsers);
    
    // Broadcast to all
    io.emit('online-count', Object.keys(onlineUsers).length);
    io.emit('live-players', livePlayers);
    io.emit('user-joined', { username: data.username });
    
    console.log(`👤 ${data.username} is now online`);
  });

  // Player won game
  socket.on('game-won', (data) => {
    // Broadcast win to all players
    io.emit('game-result', {
      username: data.username,
      amount: data.amount,
      multiplier: data.multiplier
    });
    
    // Add to recent wins
    recentWins.unshift({
      username: data.username,
      amount: data.amount,
      time: new Date().toLocaleTimeString()
    });
    
    if (recentWins.length > 10) recentWins.pop();
    io.emit('recent-winners', recentWins);
    
    console.log(`🏆 ${data.username} won ${data.amount}`);
  });

  // Player lost game
  socket.on('game-lost', (data) => {
    io.emit('game-result', {
      username: data.username,
      amount: -data.amount,
      result: 'loss'
    });
    
    console.log(`💥 ${data.username} lost ${data.amount}`);
  });

  // Player got max win
  socket.on('game-maxwin', (data) => {
    io.emit('game-result', {
      username: data.username,
      amount: data.amount,
      multiplier: data.multiplier,
      result: 'maxwin'
    });
    
    recentWins.unshift({
      username: data.username,
      amount: data.amount,
      time: new Date().toLocaleTimeString()
    });
    
    if (recentWins.length > 10) recentWins.pop();
    io.emit('recent-winners', recentWins);
    
    console.log(`🔥 ${data.username} hit MAX WIN!`);
  });

  // Request leaderboard
  socket.on('request-leaderboard', () => {
    // Send mock leaderboard (replace with real data from database)
    const leaderboard = livePlayers
      .sort((a, b) => Math.random() - 0.5)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.username,
        score: Math.floor(Math.random() * 10000)
      }));
    
    socket.emit('leaderboard-data', leaderboard);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user) {
      io.emit('user-left', { username: user.username });
      delete onlineUsers[socket.id];
      livePlayers = Object.values(onlineUsers);
      io.emit('online-count', Object.keys(onlineUsers).length);
      io.emit('live-players', livePlayers);
      console.log(`👋 ${user.username} disconnected`);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'live', 
    players: Object.keys(onlineUsers).length,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Live server running on port ${PORT}`);
});