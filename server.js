// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// Setup DB SQLite simple
const db = new sqlite3.Database(":memory:");

// Création tables
db.serialize(() => {
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE friends (
    user_id INTEGER,
    friend_id INTEGER,
    status TEXT, -- pending, accepted
    PRIMARY KEY (user_id, friend_id)
  )`);
});

// Inscription simple
app.post("/register", (req, res) => {
  const { pseudo, email, password } = req.body;
  if (!pseudo || !email || !password) return res.status(400).json({ error: "Champs manquants" });
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: "Erreur hash" });
    db.run(`INSERT INTO users(pseudo,email,password) VALUES(?,?,?)`, [pseudo, email, hash], function(err){
      if (err) return res.status(400).json({ error: "Pseudo ou email déjà utilisé" });
      res.json({ id: this.lastID, pseudo, email });
    });
  });
});

// Connexion simple (pas de JWT pour l’instant)
app.post("/login", (req, res) => {
  const { pseudo, password } = req.body;
  if (!pseudo || !password) return res.status(400).json({ error: "Champs manquants" });
  db.get(`SELECT * FROM users WHERE pseudo = ?`, [pseudo], (err, row) => {
    if (!row) return res.status(401).json({ error: "Utilisateur non trouvé" });
    bcrypt.compare(password, row.password, (err, result) => {
      if (result) {
        res.json({ id: row.id, pseudo: row.pseudo });
      } else {
        res.status(401).json({ error: "Mot de passe incorrect" });
      }
    });
  });
});

// Amis : envoyer invitation
app.post("/friend-request", (req, res) => {
  const { userId, friendPseudo } = req.body;
  db.get(`SELECT id FROM users WHERE pseudo = ?`, [friendPseudo], (err, friend) => {
    if (!friend) return res.status(404).json({ error: "Ami non trouvé" });
    // Ajout invitation en pending
    db.run(`INSERT OR IGNORE INTO friends(user_id, friend_id, status) VALUES(?,?,?)`, [userId, friend.id, "pending"], err => {
      if (err) return res.status(500).json({ error: "Erreur DB" });
      res.json({ success: true });
    });
  });
});

// Accepter invitation
app.post("/friend-accept", (req, res) => {
  const { userId, friendId } = req.body;
  // Mettre status accepted dans les deux sens
  db.run(`UPDATE friends SET status='accepted' WHERE user_id=? AND friend_id=?`, [friendId, userId], err => {
    if (err) return res.status(500).json({ error: "Erreur DB" });
    db.run(`INSERT OR IGNORE INTO friends(user_id, friend_id, status) VALUES(?,?,?)`, [userId, friendId, "accepted"], err2 => {
      if (err2) return res.status(500).json({ error: "Erreur DB" });
      res.json({ success: true });
    });
  });
});

// Lister amis acceptés
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

// Serve static frontend
app.use(express.static("public"));

// WebSocket gestion présence et chat + jeu
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("login", (user) => {
    onlineUsers[user.id] = { socketId: socket.id, pseudo: user.pseudo };
    io.emit("onlineUsers", Object.values(onlineUsers).map(u => u.pseudo));
  });

  socket.on("disconnect", () => {
    for (const userId in onlineUsers) {
      if (onlineUsers[userId].socketId === socket.id) {
        delete onlineUsers[userId];
        io.emit("onlineUsers", Object.values(onlineUsers).map(u => u.pseudo));
        break;
      }
    }
  });

  // Exemple chat
  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", msg);
  });

  // TODO : gestion jeu, sync, invitations, etc
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
