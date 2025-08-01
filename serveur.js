const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = 'CHANGE_MOI_POUR_UN_SECRET_TRES_FORT';

const users = []; // Stockage temporaire en mémoire (à remplacer par une vraie base)

// Middleware pour vérifier le token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if(err) return res.status(403).json({ message: 'Token invalide' });
    req.user = user;
    next();
  });
}

// Inscription
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis' });

  if(users.find(u => u.email === email)) return res.status(400).json({ message: 'Email déjà utilisé' });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.status(201).json({ message: 'Utilisateur créé' });
});

// Connexion
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if(!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

  const valid = await bcrypt.compare(password, user.password);
  if(!valid) return res.status(400).json({ message: 'Mot de passe incorrect' });

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

// Exemple route protégée (jeu)
app.get('/profile', authenticateToken, (req, res) => {
  res.json({ email: req.user.email });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));

