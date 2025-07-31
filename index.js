const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Login / create user
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send('Username required');

  const db = readDB();
  if (!db[username]) {
    db[username] = {
      trophies: 0,
      lives: 1,
      background: 'default'
    };
    writeDB(db);
  }

  res.json({ message: 'Logged in', user: db[username] });
});

// Get user data
app.get('/api/user/:username', (req, res) => {
  const db = readDB();
  const user = db[req.params.username];
  if (!user) return res.status(404).send('User not found');
  res.json(user);
});

// Save user data
app.post('/api/save', (req, res) => {
  const { username, trophies, lives, background } = req.body;
  if (!username) return res.status(400).send('Username required');

  const db = readDB();
  if (!db[username]) return res.status(404).send('User not found');

  db[username] = { trophies, lives, background };
  writeDB(db);
  res.json({ message: 'Saved successfully' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Blokz Server running at http://localhost:${port}`);
});
