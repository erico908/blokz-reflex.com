const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = "./users.json";

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // Pour le jeu

// Initialiser fichier d'utilisateurs
if (!fs.existsSync(USERS_FILE)) {
  fs.writeJsonSync(USERS_FILE, []);
}

// Signup
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  const users = await fs.readJson(USERS_FILE);

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ message: "Pseudo déjà utilisé." });
  }

  users.push({ username, password });
  await fs.writeJson(USERS_FILE, users);
  res.json({ message: "Compte créé avec succès." });
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await fs.readJson(USERS_FILE);

  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }

  res.json({ message: "Connexion réussie." });
});

// Start server
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});


