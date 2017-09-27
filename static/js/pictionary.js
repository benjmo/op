const NOT_STARTED = 0;
const WAITING = 1;
const STARTING = 2;
const IN_PROGRESS = 3;
const ROUND_ENDED = 4;
const GAME_OVER = 5;
let whiteboard;

const updateScore = (score) => {
  let scoreboard = $('#pictScore tbody').empty();
  for (key in score) {
    if (score.hasOwnProperty(key))
      scoreboard.append($('<tr>').append($('<td>').text(key)).append($('<td>').text(score[key])));
  }
};

const updateStatus = (status) => {
  let statusText = $('#pictStatus');
  switch (status) {
    case NOT_STARTED:
      statusText.text(`New Game starting soon`);
      break;
    case WAITING:
      statusText.text(`Waiting for more players`);
      break;
    case STARTING:
      statusText.text(`New Round Starting`);
      break;
    case IN_PROGRESS:
      statusText.text(`Round in progress`);
      break;
    case ROUND_ENDED:
      statusText.text(`New Round starting soon`);
      break;
    case GAME_OVER:
      statusText.text(`Game Over: New Game starting soon`);
      break;
  }
};

$(document).ready(function () {
  let socket = io();
  let params = (new URL(document.location)).searchParams;
  let whiteboard = $("#myDrawing").pictWhiteboard({socket: socket, drawing: true});
  let messenger = $('.messenger').pictMessenger({socket: socket, height: 60});
  let game = params.get("game");
  if (game)
    socket.emit('joinRoom', game);
  else {
    alert('No Game ID entered');
    return;
  }
  get_username(socket);
  socket.on('gameDetails', (data) => {
    console.log(data)
    updateScore(data.score);
    updateStatus(data.status);
    whiteboard.load(data.clicks);
  }).on('updateScore', (score) => {
    updateScore(score);
  }).on('nextRound', (data) => {
    if (data)
      updateScore(data.score);
  }).on('status', (status) => {
    updateStatus(status);
  });
  $('#clear').click(() => {
    socket.emit('clear');
  });
  $('#skip').click(() => {
    socket.emit('skipDrawing');
  });
});