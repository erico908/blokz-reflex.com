const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const users = []; // Temporaire — à remplacer par une vraie base de données
const SECRET = 'TON_SECRET_FORT';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Sert ton frontend (index.html, etc.)

// Enregistrement
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const userExists = users.find(u => u.email === email);

  if (userExists) return res.status(400).json({ message: 'Email déjà utilisé' });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.json({ message: 'Compte créé avec succès' });
});

// Connexion
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ message: 'Mot de passe incorrect' });

  const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '1h' });
  res.json({ message: 'Connexion réussie', token });
});

// Middleware pour routes protégées
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = user;
    next();
  });
}

// Exemple de route protégée
app.get('/me', authenticateToken, (req, res) => {
  res.json({ email: req.user.email });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));

