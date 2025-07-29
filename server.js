const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static("public"));

// Base de données persistante
const db = new sqlite3.Database("./data.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER,
    friend_id INTEGER,
    status TEXT,
    PRIMARY KEY (user_id, friend_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER,
    player2_id INTEGER,
    winner_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 🔐 Inscription
app.post("/register", (req, res) => {
  const { pseudo, email, password } = req.body;
  if (!pseudo || !email || !password) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: "Erreur hash" });
    db.run(`INSERT INTO users (pseudo, email, password) VALUES (?, ?, ?)`,
      [pseudo, email, hash],
      function (err) {
        if (err) return res.status(400).json({ error: "Pseudo ou email déjà utilisé" });
        res.json({ id: this.lastID, pseudo, email });
      });
  });
});

// 🔑 Connexion
app.post("/login", (req, res) => {
  const { pseudo, password } = req.body;
  if (!pseudo || !password) return res.status(400).json({ error: "Champs manquants" });

  db.get(`SELECT * FROM users WHERE pseudo = ?`, [pseudo], (err, row) => {
    if (!row) return res.status(401).json({ error: "Utilisateur non trouvé" });

    bcrypt.compare(password, row.password, (err, valid) => {
      if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });
      res.json({ id: row.id, pseudo: row.pseudo });
    });
  });
});

// 🤝 Demande d’ami
app.post("/friend-request", (req, res) => {
  const { userId, friendPseudo } = req.body;
  db.get(`SELECT id FROM users WHERE pseudo = ?`, [friendPseudo], (err, friend) => {
    if (!friend) return res.status(404).json({ error: "Ami non trouvé" });
    db.run(`INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)`,
      [userId, friend.id, "pending"], err => {
        if (err) return res.status(500).json({ error: "Erreur DB" });
        res.json({ success: true });
      });
  });
});

// ✅ Accepter un ami
app.post("/friend-accept", (req, res) => {
  const { userId, friendId } = req.body;

  db.run(`UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?`,
    [friendId, userId], err => {
      if (err) return res.status(500).json({ error: "Erreur DB" });

      db.run(`INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)`,
        [userId, friendId, "accepted"], err2 => {
          if (err2) return res.status(500).json({ error: "Erreur DB" });
          res.json({ success: true });
        });
    });
});

// 📋 Liste des amis
app.get("/friends/:userId", (req, res) => {
  const userId = req.params.userId;
  db.all(`
    SELECT u.id, u.pseudo FROM users u
    JOIN friends f ON u.id = f.friend_id
    WHERE f.user_id = ? AND f.status = 'accepted'
  `, [userId], (err, rows) => {
    res.json(rows || []);
  });
});

// 🌐 WebSocket
const onlineUsers = {};
const gameRooms = {}; // roomId => { player1, player2, scores }

io.on("connection", (socket) => {
  console.log("Nouvelle connexion :", socket.id);

  // 🔓 Login WebSocket
  socket.on("login", (user) => {
    onlineUsers[user.id] = { socketId: socket.id, pseudo: user.pseudo };
    io.emit("onlineUsers", Object.values(onlineUsers).map(u => u.pseudo));
  });

  // 💬 Chat
  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", msg);
  });

  // 🎮 Création de partie
  socket.on("createGame", ({ hostId, guestId }) => {
    const roomId = `game_${hostId}_${guestId}`;
    socket.join(roomId);
    gameRooms[roomId] = {
      player1: hostId,
      player2: guestId,
      scores: { [hostId]: 0, [guestId]: 0 }
    };
    io.to(roomId).emit("gameCreated", { roomId });
  });

  // 🧩 Rejoindre une partie
  socket.on("joinGame", ({ roomId }) => {
    socket.join(roomId);
    io.to(roomId).emit("gameStart");
  });

  // 🖱️ Clic sur un bloc
  socket.on("blockClicked", ({ roomId, playerId, score }) => {
    if (gameRooms[roomId]) {
      gameRooms[roomId].scores[playerId] = score;
      io.to(roomId).emit("updateScore", gameRooms[roomId].scores);
    }
  });

  // 🏁 Fin de partie
  socket.on("gameOver", ({ roomId, winnerId }) => {
    const room = gameRooms[roomId];
    if (room) {
      const { player1, player2 } = room;
      db.run(`INSERT INTO matches (player1_id, player2_id, winner_id) VALUES (?, ?, ?)`,
        [player1, player2, winnerId]);
      io.to(roomId).emit("gameEnded", { winnerId });
      delete gameRooms[roomId];
    }
  });

  // ❌ Déconnexion
  socket.on("disconnect", () => {
    for (const id in onlineUsers) {
      if (onlineUsers[id].socketId === socket.id) {
        delete onlineUsers[id];
        break;
      }
    }
    io.emit("onlineUsers", Object.values(onlineUsers).map(u => u.pseudo));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});



