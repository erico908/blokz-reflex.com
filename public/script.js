const socket = io();
let score1 = 0;
let score2 = 0;
let timeLeft = 30;

function createBlock(playerId, gridId, scoreId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "";
  const block = document.createElement("div");
  block.classList.add("block");
  const position = Math.floor(Math.random() * 16);
  block.style.gridColumnStart = (position % 4) + 1;
  block.style.gridRowStart = Math.floor(position / 4) + 1;
  block.addEventListener("click", () => {
    if (playerId === 1) score1++;
    else score2++;
    document.getElementById(scoreId).innerText = `Score : ${playerId === 1 ? score1 : score2}`;
    socket.emit("scoreUpdate", { playerId, score: playerId === 1 ? score1 : score2 });
    createBlock(playerId, gridId, scoreId);
  });
  grid.appendChild(block);
}

createBlock(1, "grid1", "score1");
createBlock(2, "grid2", "score2");

const timerInterval = setInterval(() => {
  timeLeft--;
  document.getElementById("timer").innerText = `Temps : ${timeLeft}s`;
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    alert(`Fin du jeu ! Joueur 1: ${score1} pts, Joueur 2: ${score2} pts`);
  }
}, 1000);

socket.on("scoreUpdate", ({ playerId, score }) => {
  if (playerId === 1) {
    document.getElementById("score1").innerText = `Score : ${score}`;
  } else {
    document.getElementById("score2").innerText = `Score : ${score}`;
  }
});
