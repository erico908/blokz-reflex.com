const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessages = document.getElementById('chatMessages');

sendChatBtn.onclick = sendMessage;
chatInput.onkeydown = e => { if(e.key === 'Enter') sendMessage(); }

socket.on('chat-message', data => {
  chatMessages.innerHTML += `<div><b>${data.id.substr(0,4)}:</b> ${data.message}</div>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

function sendMessage() {
  const message = chatInput.value.trim();
  if(message) {
    socket.emit('chat-message', message);
    chatInput.value = '';
  }
}
