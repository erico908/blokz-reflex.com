require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = express();

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || "BLOKZ_SUPER_SECRET";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/blokz";

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Sert les fichiers HTML/CSS/JS du dossier public

mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connecté à MongoDB"))
    .catch(err => console.error("❌ Erreur MongoDB :", err));

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = mongoose.model('User', userSchema);

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

        const user = new User({ email, password: hashed });
        await user.save();
        res.json({ message: "Compte créé" });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '7d' });
    res.json({ token });
});

// Exemple de route protégée
app.get('/profile', authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.userId);
    res.json({ email: user.email });
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});




