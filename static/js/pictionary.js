const NOT_STARTED = 0;
const WAITING = 1;
const STARTING = 2;
const IN_PROGRESS = 3;
const ROUND_ENDED = 4;
const GAME_OVER = 5;

// identifier for the round timer that decrements every second
let roundTimerID;

const updateScore = (score) => {
  let scoreboard = $('#pictScore tbody').empty();
  for (key in score) {
    if (score.hasOwnProperty(key))
      scoreboard.append($('<tr>').append($('<td>').text(key)).append($('<td>').text(score[key])));
  }
};

const updateStatus = (status, drawing, drawerName, currentWord) => {
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
      if (drawing) {
        statusText.html(`Your word is <strong>${currentWord}</strong>`);
      } else {
        statusText.text(`${drawerName}'s turn to draw`);
      }
      break;
    case ROUND_ENDED:
      statusText.text(`New Round starting soon`);
      break;
    case GAME_OVER:
      statusText.text(`Game Over: New Game starting soon`);
      break;
  }
};

/**
 * Updates the round timer to begin counting down from the given seconds
 * or clears the timer if seconds evaluates to false
 */
const updateRoundTimer = (seconds) => {
  // cancel any previously running round timer
  clearInterval(roundTimerID);

  if (!seconds) {
    $("#roundTimer").text('');
  } else {
    $("#roundTimer").text(new Date(seconds * 1000).toISOString().substr(14, 5));

    // set the round timer to decrement every second
    roundTimerID = setInterval(() => {
      seconds -= 1;
      $("#roundTimer").text(new Date(seconds * 1000).toISOString().substr(14, 5));
      if (seconds === 0) {
        clearInterval(roundTimerID);
      }
    }, 1000);
  }
};

const updateHint = (hint) => {
  if (hint == '') {
    $("#hintText").text('');
  } else {
    $("#hintText").text('Hint: ' +  hint);
  }
};

$(document).ready(function () {
  let socket = io();
  let params = (new URL(document.location)).searchParams;
  let id = socket.id;
  let game = params.get("game");
  let whiteboard, messenger;
  let error = false;
  socket.on('clientInfo', (data) =>  {
    console.log(data);
    if (data.status) {
      alert('Already in a game');
      error = true;
      return;
    }
    if (!data.name) {
      if (game) {
        socket.emit('joinRoom', game);
      } else {
        alert('No Game entered');
        error = true;
        return;
      }
      get_username(socket);
    }
    id = data.id;
    whiteboard = $("#myDrawing").pictWhiteboard({socket: socket, drawing: true});
    messenger = $('.messenger').pictMessenger({socket: socket, height: 60, inputHeight:20});
  });
  if (error)
    return;
  console.log('Test');
  socket.on('gameDetails', (data) => {
    if (data.seconds > 0) {
      updateRoundTimer(data.seconds);
    }
    updateScore(data.score);
    const drawing = data.drawer == id;
    updateStatus(data.state, drawing, data.drawerName, data.currentWord);
    whiteboard.load(data.clicks);
  }).on('updateScore', (score) => {
    console.log(score);
    updateScore(score);
  }).on('nextRound', (data) => {
    if (data) {
      updateScore(data.score);
      const drawing = data.drawer == id;
      whiteboard.setDrawable(drawing);
      updateStatus(IN_PROGRESS, drawing, data.drawerName, data.currentWord);
    }
  }).on('roundTimer', (seconds) => {
    updateRoundTimer(seconds);
  }).on('status', (status) => {
    updateStatus(status);
  }).on('hint', (hint) => {
    updateHint(hint);
  });
  $('#clear').click(() => {
    socket.emit('clear');
  });
  $('#skip').click(() => {
    socket.emit('skipDrawing');
  });
  $('#hint').click(() => {
    socket.emit('hint');
  });
});