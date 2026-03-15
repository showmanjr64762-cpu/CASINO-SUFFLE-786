const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = socketIO(server,{
  cors:{origin:"*",methods:["GET","POST"]}
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));


// ================= FIREBASE =================

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
const auth = admin.auth();


// ================= SOCKET.IO =================

let connectedUsers = {};
let adminConnections = new Set();

io.on("connection",(socket)=>{

  console.log("User connected:",socket.id);

  socket.on("user:join",(data)=>{

    connectedUsers[socket.id] = {
      userId:data.userId,
      username:data.username
    };

    socket.join("users");

    io.emit("users:online-count",Object.keys(connectedUsers).length);

  });

  socket.on("admin:join",()=>{

    adminConnections.add(socket.id);
    socket.join("admin");

  });

  socket.on("game:completed",(data)=>{

    io.to("admin").emit("game:new-result",data);
    io.emit("leaderboard:update",data);

  });

  socket.on("disconnect",()=>{

    delete connectedUsers[socket.id];
    adminConnections.delete(socket.id);

    io.emit("users:online-count",Object.keys(connectedUsers).length);

    console.log("User disconnected:",socket.id);

  });

});


// ================= AUTH =================

const verifyToken = async(req,res,next)=>{

  try{

    const token = req.headers.authorization?.split("Bearer ")[1];

    if(!token){
      return res.status(401).json({error:"No token"});
    }

    const decoded = await auth.verifyIdToken(token);

    req.userId = decoded.uid;

    next();

  }catch(error){

    res.status(401).json({error:"Invalid token"});

  }

};


// ================= REGISTER =================

app.post("/api/auth/register",async(req,res)=>{

  try{

    const {email,password,username} = req.body;

    const user = await auth.createUser({
      email,
      password,
      displayName:username
    });

    await db.ref("users/"+user.uid).set({
      email,
      username,
      coins:1000,
      level:1,
      xp:0,
      totalWins:0,
      totalLosses:0,
      totalGamesPlayed:0,
      createdAt:admin.database.ServerValue.TIMESTAMP
    });

    res.json({uid:user.uid});

  }catch(error){

    res.status(400).json({error:error.message});

  }

});


// ================= USER PROFILE =================

app.get("/api/users/:userId",verifyToken,async(req,res)=>{

  try{

    const snap = await db.ref("users/"+req.params.userId).once("value");

    if(!snap.exists()){
      return res.status(404).json({error:"User not found"});
    }

    res.json(snap.val());

  }catch(error){

    res.status(500).json({error:error.message});

  }

});


// ================= LEADERBOARD =================

app.get("/api/leaderboard",async(req,res)=>{

  try{

    const snap = await db.ref("users")
      .orderByChild("totalWins")
      .limitToLast(100)
      .once("value");

    const leaderboard=[];

    snap.forEach(child=>{
      leaderboard.push({
        uid:child.key,
        ...child.val()
      });
    });

    res.json(leaderboard.reverse());

  }catch(error){

    res.status(500).json({error:error.message});

  }

});


// ================= SERVE PAGES =================

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

app.get("/dashboard",(req,res)=>{
  res.sendFile(path.join(__dirname,"public","dashboard.html"));
});


// ================= START SERVER =================

const PORT = process.env.PORT || 3000;

server.listen(PORT,()=>{
  console.log("Server running on port "+PORT);
});