const socket = io();

const playersStatus = document.getElementById('playersStatus');

const playerAreas = {
  [null]: null, // pour stocker le joueur local (sera défini après auth)
};

let localPlayerId = null;
let localPlayerArea = null;

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    // Connecté
    localPlayerId = null; // on va chercher son socket id plus tard
  } else {
    localPlayerId = null;
  }
});

// Dès que le serveur envoie l’état joueurs
socket.on('players-update', players => {
  if(!localPlayerId) {
    // On cherche l'id socket correspondant à notre session
    localPlayerId = socket.id;
  }

  // Affiche le nombre de joueurs
  playersStatus.innerHTML = `Joueurs connectés: ${Object.keys(players).length}`;

  // Met à jour les zones des joueurs
  const ids = Object.keys(players);
  const areas = ['player1', 'player2'];

  for(let i=0; i<areas.length; i++) {
    const area = document.getElementById(areas[i]);
    if(ids[i]) {
      const p = players[ids[i]];
      area.querySelector('.score').textContent = p.score;
      area.querySelector('.lives').textContent = p.lives;
    } else {
      area.querySelector('.score').textContent = '-';
      area.querySelector('.lives').textContent = '-';
    }
  }
});

// Gestion du jeu (exemple simplifié)

function createBlock(areaEl) {
  const block = document.createElement('div');
  block.classList.add('block');

  const maxX = areaEl.clientWidth - 50;
  const maxY = areaEl.clientHeight - 50;

  block.style.left = Math.random() * maxX + 'px';
  block.style.top = Math.random() * maxY + 'px';

  areaEl.appendChild(block);

  const timeout = setTimeout(() => {
    if (block.parentNode) {
      block.parentNode.removeChild(block);
      loseLife();
    }
  }, 3000);

  block.onclick = () => {
    clearTimeout(timeout);
    block.parentNode.removeChild(block);
    addScore();
  };
}

function addScore() {
  // À compléter: envoyer score au serveur
}

function loseLife() {
  // À compléter: envoyer vies au serveur
}

// Exemple simple: spawn un bloc toutes les 1.5s dans chaque zone
setInterval(() => {
  const p1Zone = document.querySelector('#player1 .gameZone');
  const p2Zone = document.querySelector('#player2 .gameZone');

  createBlock(p1Zone);
  createBlock(p2Zone);
}, 1500);
;
