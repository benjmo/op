const NOT_STARTED = 0;
const WAITING = 1;
const STARTING = 2;
const IN_PROGRESS = 3;
const ROUND_ENDED = 4;
const GAME_OVER = 5;

// identifier for the round timer that decrements every second
let roundTimerID;

// ticking sound object, don't want to create new instance every time so it is in global
let tickingSound = new Audio("/sound/ticking_cut.mp3");
tickingSound.loop = true;

const updateScore = (data) => {
  let scoreboard = $('#pictScore tbody').empty();
  const teams = data.teams;
  const score = data.score;
  if (teams) {
    for (const i of Object.keys(teams)) {
      const team = teams[i];
      const teamScore = team.reduce((acc, curr, i, arr) => acc + score[curr], 0);
      if (i == 1) {
        scoreboard.append($('<tr>').append($('<td>').append($('<b style="color:#cc0099">').text('Team ' + i))).append($('<td style="color:#cc0099">').text(teamScore)));
      } else {
        scoreboard.append($('<tr>').append($('<td>').append($('<b style="color:#33ccff">').text('Team ' + i))).append($('<td style="color:#33ccff">').text(teamScore)));
      }
      for (const member of team) {
        scoreboard.append($('<tr>').append($('<td>').html(member)).append($('<td>').text(score[member])));
      }
    }
  } else {
    for (key in score) {
      if (score.hasOwnProperty(key))
        scoreboard.append($('<tr>').append($('<td>').html(key)).append($('<td>').text(score[key])));
    }  
  }
};

const updateStatus = (status, drawing, drawerName, currentWord) => {
  let statusText = $('#pictStatus');
  switch (status) {
    case NOT_STARTED:
      statusText.text(`New game starting soon`);
      break;
    case WAITING:
      statusText.text(`Waiting for more players`);
      break;
    case STARTING:
      statusText.text(`New round starting`);
      break;
    case IN_PROGRESS:
      if (drawing) {
        statusText.html(`Your word is <strong>${currentWord}</strong>`);
      } else {
        statusText.html(`${drawerName}'s turn to draw`);
      }
      break;
    case ROUND_ENDED:
      statusText.text(`New round starting soon`);
      break;
    case GAME_OVER:
      statusText.text(`Game Over: New game starting soon`);
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

      if (seconds <= 10 && tickingSound.paused) {
        tickingSound.play();
      }

      $("#roundTimer").text(new Date(seconds * 1000).toISOString().substr(14, 5));
      if (seconds === 0) {
        clearInterval(roundTimerID);
        tickingSound.pause();
        tickingSound.currentTime = 0;
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
  let navbarHeight = 0;
  let scoreCol = document.getElementById("scoreSettingsCol");
  let scoreboardHeight = 2/5;
  const resizeUI = () => {
    $('#scoreSettingsCol').height($(window).height() - navbarHeight-(scoreCol.offsetHeight-scoreCol.clientHeight));
    $('#pictScore').height($('#scoreSettingsCol').height()*scoreboardHeight);
  };
  resizeUI();
  let resizeTimer;
  $(window).resize(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeUI,500);
  });
  whiteboard = $("#myDrawing").pictWhiteboard({socket: socket, drawing: true});
  messenger = $('.messenger').pictMessenger({socket: socket, height: 100, inputHeight:5});
  socket.on('clientInfo', (data) =>  {
    console.log(data);
    if (data.status) {
      alert('Already in a game');
      window.location.replace('/');
      error = true;
      return;
    }
    if (!data.name) {
      if (game) {
        socket.emit('joinRoom', game);
      } else {
        alert('No Game entered');
        window.location.replace('/');
        error = true;
        return;
      }
      get_username(socket);
    }
    id = data.id;
  });
  if (error)
    return;
  console.log('Test');
  socket.on('gameDetails', (data) => {
    if (data.seconds > 0) {
      updateRoundTimer(data.seconds);
    }
    updateScore(data);
    const drawing = data.drawer == id;
    updateStatus(data.state, drawing, data.drawerName, data.currentWord);
    whiteboard.load(data.clicks);
  }).on('updateScore', (data) => {
    console.log(data);
    updateScore(data);
  }).on('nextRound', (data) => {
    if (data) {
      //new round start
      let newRoundSound = new Audio("/sound/low_bell.mp3");
      newRoundSound.play();

      updateScore(data);
      const drawing = data.drawer == id;
      whiteboard.setDrawable(drawing);
      updateStatus(IN_PROGRESS, drawing, data.drawerName, data.currentWord);
    } else {
      // round end
      tickingSound.pause();
      tickingSound.currentTime = 0;
    }
  }).on('roundTimer', (seconds) => {
    updateRoundTimer(seconds);
  }).on('status', (status) => {
    updateStatus(status);
  }).on('hint', (hint) => {
    updateHint(hint);
  }).on('chatMessage', (msg) => {
    let messageSound = new Audio("/sound/single_tap.mp3");
    messageSound.play();
  });//.on('skipDrawing', () => {
  //   let skipSound = new Audio("/sound/high_ding.mp3");
  //   skipSound.play();
  // });

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
