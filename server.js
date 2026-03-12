const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Firebase Setup
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
const auth = admin.auth();
const storage = admin.storage().bucket();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ==================== AUTHENTICATION ====================

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decodedToken = await auth.verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.email = decodedToken.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username
    });

    await db.ref(`users/${userRecord.uid}`).set({
      email,
      username,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      coins: 1000,
      level: 1,
      xp: 0,
      totalWins: 0,
      totalLosses: 0,
      totalGamesPlayed: 0,
      avatar: 'default',
      premium: false
    });

    res.status(201).json({
      message: 'User registered successfully',
      uid: userRecord.uid
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Note: Firebase Admin SDK doesn't have direct login. 
    // Use Firebase Client SDK on frontend or custom token
    const customToken = await auth.createCustomToken(email);
    
    res.json({ token: customToken });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// ==================== USER PROFILE ====================

// Get User Profile
app.get('/api/users/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const snapshot = await db.ref(`users/${userId}`).once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(snapshot.val());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile
app.put('/api/users/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, avatar } = req.body;

    if (userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = {};
    if (username) updates.username = username;
    if (avatar) updates.avatar = avatar;

    await db.ref(`users/${userId}`).update(updates);
    res.json({ message: 'Profile updated', updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GAME RESULTS ====================

// Save Game Result
app.post('/api/games/result', verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const { coinsEarned, xpEarned, won, level, duration } = req.body;

    if (!coinsEarned || !xpEarned || won === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    const user = snapshot.val();

    const newCoins = user.coins + coinsEarned;
    const newXp = user.xp + xpEarned;
    const newLevel = Math.floor(newXp / 1000) + 1;
    const newWins = user.totalWins + (won ? 1 : 0);
    const newLosses = user.totalLosses + (won ? 0 : 1);

    await userRef.update({
      coins: newCoins,
      xp: newXp,
      level: newLevel,
      totalWins: newWins,
      totalLosses: newLosses,
      totalGamesPlayed: user.totalGamesPlayed + 1,
      lastPlayedAt: admin.database.ServerValue.TIMESTAMP
    });

    // Save game result
    const gameId = db.ref('games').push().key;
    await db.ref(`games/${gameId}`).set({
      userId,
      username: user.username,
      coinsEarned,
      xpEarned,
      won,
      duration,
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    res.json({
      message: 'Game result saved',
      coins: newCoins,
      xp: newXp,
      level: newLevel
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Game History
app.get('/api/games/history/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.ref('games')
      .orderByChild('userId')
      .equalTo(userId)
      .limitToLast(50)
      .once('value');

    const games = [];
    snapshot.forEach(child => {
      games.push({ id: child.key, ...child.val() });
    });

    res.json(games.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LEADERBOARD ====================

// Get Global Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const snapshot = await db.ref('users')
      .orderByChild('totalWins')
      .limitToLast(100)
      .once('value');

    const leaderboard = [];
    snapshot.forEach(child => {
      leaderboard.push({
        uid: child.key,
        username: child.val().username,
        totalWins: child.val().totalWins,
        level: child.val().level,
        coins: child.val().coins
      });
    });

    res.json(leaderboard.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Level Leaderboard
app.get('/api/leaderboard/level', async (req, res) => {
  try {
    const snapshot = await db.ref('users')
      .orderByChild('level')
      .limitToLast(100)
      .once('value');

    const leaderboard = [];
    snapshot.forEach(child => {
      leaderboard.push({
        uid: child.key,
        username: child.val().username,
        level: child.val().level,
        xp: child.val().xp
      });
    });

    res.json(leaderboard.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MULTIPLAYER ====================

// Set Online Status
app.post('/api/multiplayer/online', verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const userSnapshot = await db.ref(`users/${userId}`).once('value');
    
    await db.ref(`onlinePlayers/${userId}`).set({
      username: userSnapshot.val().username,
      level: userSnapshot.val().level,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ message: 'Online status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Online Players
app.get('/api/multiplayer/online', async (req, res) => {
  try {
    const snapshot = await db.ref('onlinePlayers').once('value');
    const players = [];
    
    snapshot.forEach(child => {
      players.push({
        uid: child.key,
        ...child.val()
      });
    });

    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set Offline
app.post('/api/multiplayer/offline', verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    await db.ref(`onlinePlayers/${userId}`).remove();
    res.json({ message: 'Offline status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN DASHBOARD ====================

// Admin Verification
const verifyAdmin = async (req, res, next) => {
  try {
    const { userId } = req;
    const snapshot = await db.ref(`admins/${userId}`).once('value');
    
    if (!snapshot.exists()) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    
    next();
  } catch (error) {
    res.status(403).json({ error: 'Admin verification failed' });
  }
};

// Dashboard Stats
app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.ref('users').once('value');
    const gamesSnapshot = await db.ref('games').once('value');
    const onlineSnapshot = await db.ref('onlinePlayers').once('value');

    const totalUsers = usersSnapshot.numChildren();
    const totalGames = gamesSnapshot.numChildren();
    const onlinePlayers = onlineSnapshot.numChildren();

    let totalCoinsInGame = 0;
    usersSnapshot.forEach(child => {
      totalCoinsInGame += child.val().coins || 0;
    });

    res.json({
      totalUsers,
      totalGames,
      onlinePlayers,
      totalCoinsInGame
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Users (Admin)
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.ref('users').once('value');
    const users = [];

    snapshot.forEach(child => {
      users.push({
        uid: child.key,
        ...child.val()
      });
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban User (Admin)
app.post('/api/admin/users/:userId/ban', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await db.ref(`users/${userId}`).update({
      banned: true,
      bannedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unban User (Admin)
app.post('/api/admin/users/:userId/unban', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await db.ref(`users/${userId}`).update({
      banned: false
    });

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Coins to User (Admin)
app.post('/api/admin/users/:userId/coins', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    const currentCoins = snapshot.val().coins;

    await userRef.update({
      coins: currentCoins + amount
    });

    res.json({ message: 'Coins added', newBalance: currentCoins + amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Game Analytics (Admin)
app.get('/api/admin/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const gamesSnapshot = await db.ref('games').once('value');
    const games = [];

    gamesSnapshot.forEach(child => {
      games.push(child.val());
    });

    const totalGames = games.length;
    const totalCoinsEarned = games.reduce((sum, game) => sum + game.coinsEarned, 0);
    const totalXpEarned = games.reduce((sum, game) => sum + game.xpEarned, 0);
    const winRate = games.filter(g => g.won).length / totalGames * 100;

    res.json({
      totalGames,
      totalCoinsEarned,
      totalXpEarned,
      winRate: winRate.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLEANUP ====================

// Clean up offline players every 5 minutes
setInterval(async () => {
  try {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const snapshot = await db.ref('onlinePlayers').once('value');

    snapshot.forEach(child => {
      if (child.val().timestamp < fiveMinutesAgo) {
        child.ref.remove();
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 5 * 60 * 1000);

// ==================== SERVE DASHBOARD ====================

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
