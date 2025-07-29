const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

let players = {};

io.on('connection', (socket) => {
  console.log('Un joueur connecté:', socket.id);

  // Nouvel joueur
  players[socket.id] = { score: 0, lives: 2 };

  // Envoie l’état actuel aux autres joueurs
  io.emit('players-update', players);

  // Réception mise à jour joueur (score, vie)
  socket.on('update-state', data => {
    if(players[socket.id]) {
      players[socket.id].score = data.score;
      players[socket.id].lives = data.lives;
      io.emit('players-update', players);
    }
  });

  // Chat
  socket.on('chat-message', msg => {
    io.emit('chat-message', {id: socket.id, message: msg});
  });

  // Joueur déconnecté
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté:', socket.id);
    delete players[socket.id];
    io.emit('players-update', players);
  });
});

http.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

