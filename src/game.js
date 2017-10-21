/**
 * File for functions that handle socket.io events related to the game
 */

const util = require('./util');
const wordlist = require('./wordlist');
const roomUtil = require('./room');
//const WIN_SCORE = 5;

// base points for guessing correctly
const POINTS_GUESS = 10;
// reduction in points for each person who's already guessed
const POINTS_REDUCE = 1;
// base points for your drawing getting guessed (initial guess)
const POINTS_DRAW = 10;

// amount of time given for a new round (in seconds)
const ROUND_DURATION = 120;
// scaling factor to modify the time remaining after the first correct guess
const TIME_MODIFIER = 6;
// minimum amount of time remaining after the first correct guess (in seconds)
const MIN_MODIFIED_TIME = 10;

// maximum time to wait for reconnection before timing out a user (in ms)
const TIME_OUT = 10000;

let rooms = {};
let shapes = ['rectangle','circle','line'];

/**
 * Subscribe the client's socket to the given room's channel
 * @param room Room object
 */
const joinRoom = function (room) {
  this.socket.join(room.id);
  this.room = room;
  this.session.room = room.id;
  this.session.save();
  this.session.inGame = true;
  this.session.save();
};

/**
 * Leave the channel the client is currently in
 */
const disconnect = function () {
  if (this.room)
    this.socket.leave(this.room.id, () => {
      this.room.disconnectUser(this.getID(),this.session);
    });
};

const reconnect = function (room) {
  if (room) {
    this.joinRoom(room);
    room.reconnectUser(this.getID());
  }
};

/**
 * Draw the given mouse action on the whiteboard
 * Only allows the current drawer to draw, unless noone has been assigned yet
 * @param data Mouse action including x, y, action type
 */
const draw = function (data) {
  if (this.room && (this.room.currentDrawer() == this.getID() || this.room.currentDrawer() == null)) {
    this.io.to(this.room.id).emit('draw', data);
    if (shapes.includes(data.tool)) {
      if (data.status == "end")
        this.room.addClick(data);
    } else {
      this.room.addClick(data);
    }
  }
};

/**
 * Clear the drawing
 * Only allows the current drawer to clear, unless noone has been assigned yet
 */
const clearDrawing = function () {
  if (this.room && (this.room.currentDrawer() == this.getID() || this.room.currentDrawer() == null)) {
    this.room.clearClicks();
  }
};

/**
 * Gives a hint to everyone
 */
const giveHint = function() {
  if (this.room && (this.room.currentDrawer() == this.getID() || this.room.currentDrawer() == null) &&
      this.room.state === IN_PROGRESS && this.room.hintsGiven < 3) {
    let hint = util.giveHint(this.room.currentWord, this.room.hintsGiven);
    this.io.to(this.room.id).emit('hint', hint);
    let emitData = {
      message: 'Hint: ' + hint,
      type: 'hint'
    }

    this.io.to(this.room.id).emit('sysMessage', emitData);
    this.room.hintsGiven++;
  }
};

/**
 * Send a chat message to all clients
 * Also checks if the chat message has guessed the current word
 * @param data Chat Message
 */
const chatMessage = function (data) {
  let socket = this.socket, io = this.io, room = this.room;
  // if the sender can guess (not drawer and hasn't successfully guessed)
  let isGuessing = room.currentDrawer() !== this.getID() && !room.pointsEarned[this.name];
  if (room.hasTeams) {
    // guesser also has to be on the same team as the drawer
    isGuessing = isGuessing && room.getUserTeam(room.currentDrawer()) === room.getUserTeam(this.getID());
  }
  // if the guess is correct or close)
  let isCorrect = room.currentWord != "" && util.checkGuess(room.currentWord, data);
  data = util.sanitize(data);
  if (isCorrect === util.CORRECT_GUESS) {
    let emitData = {
      type: 'correctGuess'
    }
    if (isGuessing) {
      // player correctly guessed
      if (room.hasTeams) { // to everyone else
        if (room.getUserTeam(this.getID()) == 1) {
          emitData.message = `<span style="color:#cc0099"><strong>${this.name}</strong> successfully guessed the word!</span>`;
          socket.broadcast.to(room.id).emit('sysMessage', emitData);
        } else {
          emitData.message = `<span style="color:#33ccff"><strong>${this.name}</strong> successfully guessed the word!</span>`
          socket.broadcast.to(room.id).emit('sysMessage', emitData);
        }
      } else {
        emitData.message = `<strong>${this.name}</strong> successfully guessed the word!`;
        socket.broadcast.to(room.id).emit('sysMessage', emitData); 
      }
      emitData.message = `You guessed the word: <strong>${room.currentWord}</strong>`;
      socket.emit('sysMessage', emitData); // to self
      room.awardPoints(this.getID());
    } else {
      socket.emit('chatMessage','Please don\'t reveal the word in chat');
    }
  } else if (isCorrect === util.CLOSE_GUESS) {
    let emitData = {
      type: 'closeGuess'
    }
    if (isGuessing) {
      emitData.message = `${data} is close!`;
      socket.emit('sysMessage', emitData); //to self      
    } else {
      socket.emit('chatMessage','Please don\'t reveal the word in chat');
    }
  } else {
    // just a normal message
    if (room.hasTeams) {
      if (room.getUserTeam(this.getID()) == 1) {
        io.to(room.id).emit('chatMessage', `<strong style="color:#cc0099">${this.name}</strong>: ${data}`);
      } else {
        io.to(room.id).emit('chatMessage', `<strong style="color:#33ccff">${this.name}</strong>: ${data}`);
      }
    } else {
      io.to(room.id).emit('chatMessage', `<strong>${this.name}</strong>: ${data}`);
    }
  }
};

/**
 * Handles setting the name of the client. Name must be unique.
 * @param name Chosen Name
 * @returns {boolean} Whether the name has been taken
 */
const nameMessage = function (name) {
  // Set if unique, ask again if not
  let room = this.room;
  name = util.sanitize(name);
  let unique = !room.hasName(name);
  if (unique) {
    this.name = name;
    this.socket.emit('gameDetails', room.getState());
    room.addUser(this.getID(), this.name);
    // broadcast to everyone in the room
    if (room.hasTeams) {
      if (room.getUserTeam(this.getID()) == 1) {
        this.socket.broadcast.to(room.id).emit('chatMessage', `<span style="color:#cc0099"><strong>${this.name}</strong> has joined the room</span>`);
      } else {
        this.socket.broadcast.to(room.id).emit('chatMessage', `<span style="color:#33ccff"><strong>${this.name}</strong> has joined the room</span>`);
      }
    } else {
      this.socket.broadcast.to(room.id).emit('chatMessage', `<strong>${this.name}</strong> has joined the room`);
    }
    this.session.name = name;
    this.session.save();
  }
  return unique;
};

const getName = function () {
  return this.name;
};

const setName = function (name) {
  this.name = name;
};

/**
 * Skip current users drawing turn
 */
const skipDrawing = function () {
  if (this.room && (this.room.currentDrawer() == this.getID() || this.room.currentDrawer() == null) &&
      Object.keys(this.room.pointsEarned).length <= 1) {
    this.room.nextRound();
  }
};

const getID = function () {
  return this.id;
};

/**
 * Client Object
 * @param io socket.io instance
 * @param socket socket.io socket of client
 * @param session session object of client
 * @param id id of client
 * @constructor
 */
function Client(io,socket,session,id) {
  this.io = io;
  this.socket = socket;
  this.session = session;
  if (id)
    this.id = id;
  else
    this.id = socket.id;
  this.room = null;
  this.name = null;
}

Client.prototype = {
  skipDrawing,
  chatMessage,
  draw,
  joinRoom,
  disconnect,
  reconnect,
  clearDrawing,
  nameMessage,
  getName,
  setName,
  giveHint,
  getID,
};

/**
 * Returns the current drawers ID
 * @returns {*|null} Drawer ID or null if not set
 */
const currentDrawer = function() {
  return this.drawer;
};

/**
 * Awards points for a round and maybe ends it
 * @param winner The winner of the round, or null if no one won
 */
const awardPoints = function(winner) {
  // drawer gets pointsEarned in a round
  const correctGuesses = Object.keys(this.pointsEarned).length - 1;
  const value = Math.max(POINTS_GUESS - (correctGuesses * POINTS_REDUCE), 1);
  this.addScore(winner, value);
  if (correctGuesses > 0) {
    this.addScore(this.drawer, 1);
    this.pointsEarned[this.names[this.drawer]] += 1;
  } else {
    this.addScore(this.drawer, POINTS_DRAW - this.hintsGiven);
    this.pointsEarned[this.names[this.drawer]] += (POINTS_DRAW - this.hintsGiven);
  }
  this.io.to(this.id).emit('updateScore', {teams: this.teams, score: this.score});
  this.pointsEarned[this.names[winner]] = value;

  // if either everyone has successfully guessed, or guesses are no longer worth points
  if (value - POINTS_REDUCE <= 0 || Object.keys(this.pointsEarned).length === this.users.length) {
    this.endRound();
  } else if (correctGuesses === 0) {
    // if this was the first correct guess, modify the time remaining in the round
    const currentTime = (this.roundEndTime - Date.now()) / 1000;
    const modifiedTime = Math.round((currentTime / TIME_MODIFIER) + MIN_MODIFIED_TIME);
    this.setRoundTimer(modifiedTime);
    this.io.to(this.id).emit('chatMessage', 'Only ' + modifiedTime + ' seconds remaining');
  }
};

/**
 * Ends the current round, showing a points summary in the chat
 */
const endRound = function() {
  const correctGuesses = Object.keys(this.pointsEarned).length - 1;
  let roundEndString;
  if (correctGuesses === 0) {
    roundEndString = 'The round is over!';
  } else {
    roundEndString = '<p>The round is over! Points earned:</p>\n';
    for (const player of Object.keys(this.pointsEarned)) {
      if (this.hasTeams) {
        if (this.getUserTeam(player) == 1) {
          roundEndString += '<p><span style="color:#cc0099">' + player + '</span>: ' + this.pointsEarned[player] + '</p>'
        } else {
          roundEndString += '<p><span class="colour" style="color:#33ccff">' + player + '</span>: ' + this.pointsEarned[player] + '</p>'
        }
      } else {
        roundEndString += '<p>' + player + ': ' + this.pointsEarned[player] + '</p>'
      }
    }
  }
  this.io.to(this.id).emit('chatMessage', roundEndString);
  this.nextRound();
};

/**
 * Starts the next round if there are enough players and updates the game state
 */
const nextRound = function() {
  let users = this.users, io = this.io, room = this;
  console.log('New round: ', users);
  this.clearRoundTimer();
  if (!this.enoughPlayers()) {
    this.state = WAITING;
    this.io.to(this.id).emit('status',WAITING);
    return;
  }
  if (this.drawer == null) {
    this.drawer = users[0];
  } else {
    if (this.hasTeams && this.useTeamScoring) {
      // consecutive drawers must be from different teams
      // TODO: don't make it random
      const newTeam = this.getUserTeam(this.drawer) % this.numTeams + 1; // + 1 after mod becase teams are 1 indexed
      this.drawer = this.teams[newTeam][Math.floor(Math.random(this.teams[newteam].length))];
    } else {
      this.drawer = users[(users.indexOf(this.drawer)+1) % users.length];
    }
  }
  this.clicks = [];
  this.pointsEarned = {};
  this.pointsEarned[room.names[room.drawer]] = 0;
  this.currentWord = wordlist.getRandomWord(this.wordTheme);
  this.hintsGiven = 0;
  io.to(this.id).emit('hint', "");
  io.to(this.id).emit('nextRound');
  io.to(this.id).emit('chatMessage', 'The next round will begin soon...');
  this.state = STARTING;
  setTimeout(function() {
    io.to(room.id).emit('nextRound', {
      drawer: room.drawer,
      drawerName: room.names[room.drawer],
      currentWord: room.currentWord,
      teams: room.teams,
      score: room.score
    });
    room.setRoundTimer(room.timeLimit);
    room.state = IN_PROGRESS;
  },5000);
};

/**
 * Sets the timer for the current round to the given seconds
 * @param seconds a positive integer number of seconds
 */
const setRoundTimer = function(seconds) {
  // clear any previously running round timer
  clearTimeout(this.roundTimerID);

  this.io.to(this.id).emit('roundTimer', seconds);
  this.roundTimerID = setTimeout(() => {
    this.endRound();
  }, seconds * 1000);
  this.roundEndTime = Date.now() + seconds * 1000;
};

/**
 * Clears any previously running round timer
 */
const clearRoundTimer = function() {
  clearTimeout(this.roundTimerID);
  this.io.to(this.id).emit('roundTimer', null);
  this.roundEndTime = 0;
};

/**
 * Gives points to a user
 * @param user - user's ID
 * @param score - score to add
 */
const addScore = function(user, score) {
  const name = this.names[user];
  this.score[name] += score;
  /*if (this.score[name] >= WIN_SCORE) {
    this.state = GAME_OVER;
  }*/
};

/**
 * Add a new user's information to the game
 * Starts the game if it is waiting for players, or not started yet
 * @param user User's ID
 * @param name User's chosen name
 */
const addUser = function(user, name) {
  this.users.push(user);
  this.names[user] = name;
  this.score[name] = 0;

  // if game is playing with teams, assign a team for user
  if (this.hasTeams) {
    const team1 = this.teams[1].length;
    const team2 = this.teams[2].length;
    const newTeam = (team1 <= team2) ? 1 : 2;
    this.teams[newTeam].push(name);
  }

  this.io.to(this.id).emit('updateScore',{teams: this.teams, score: this.score});
  if (this.enoughPlayers() && (this.state == NOT_STARTED || this.state == WAITING)) {
    this.nextRound();
  }
};

const getUserTeam = function(user) {
  // if not name, convert to name
  if (this.users.indexOf(user) !== -1) {
    user = this.names[user];
  }
  for (let i = 1; i <= this.numTeams; i++) {
    if (this.teams[i].indexOf(user) !== -1)
      return i;
  }
  return 0;
}

const enoughPlayers = function() {
  if (this.hasTeams) {
    for (let i = 1; i <= this.numTeams; i++) {
      if (this.teams[i].length < 2)
        return false;
    }
    return true;
  } else {
    return this.users.length >= this.minPlayers;
  }
}

/**
 * Remove a user's information from the game
 * Also ends the current round with no winner if they were they drawer,
 * or there are not enough players remaining
 * @param user User's ID
 */
const disconnectUser = function(user,session) {
  session.inGame = false;
  session.save();
  this.timeOut[user] = true;
  setTimeout(() => {
    if (this.timeOut[user]) {
      this.users.splice(this.users.indexOf(user),1);
      if (this.hasTeams) {
        const team = this.getUserTeam(user);
        if (team)
          this.teams[team].splice(this.teams[team].indexOf(user), 1);
      }
      delete this.score[this.names[user]];
      delete this.names[user];
      session.destroy();
      if (user == this.drawer || !this.enoughPlayers()) {
        this.nextRound();
        this.clearClicks();
      }
      this.io.to(this.id).emit('updateScore',{teams: this.teams, score: this.score});
    }
  }, TIME_OUT);
};

const reconnectUser = function (user) {
  this.timeOut[user] = false;
  this.io.to(this.id).emit('updateScore',{teams: this.teams, score: this.score});
};

/**
 * Gets the current game state
 * @returns {{state: *, drawer: *, drawerName: *, currentWord: *, score: *, clicks: *, seconds: *}}
 */
const getState = function () {
  return {
    state: this.state,
    drawer: this.drawer,
    drawerName: this.names[this.drawer],
    currentWord: this.currentWord,
    score: this.score,
    teams: this.teams,
    clicks: this.clicks,
    seconds: Math.round((this.roundEndTime - Date.now()) / 1000) // seconds left in the round
  };
};

/**
 * Add a mouse action to the game state
 * @param data Mouse action including x, y, action type
 */
const addClick = function (data) {
  this.clicks.push(data);
};

/**
 * Clears all stored mouse actions and tells all clients to clear
 */
const clearClicks = function () {
  this.clicks = [];
  this.io.to(this.id).emit('clear');
};

/**
 * Checks if the given name is taken
 * @param name Name to be checked
 * @returns {boolean} Whether the name is taken
 */
const hasName = function (name) {
  for (id in this.names)
    if (this.names.hasOwnProperty(id) && this.names[id] == name)
      return true;
  return false;
};

/**
 * Game Status's
 * @constant
 * @type {number}
 */
const NOT_STARTED = 0;
const WAITING = 1;
const STARTING = 2;
const IN_PROGRESS = 3;
const ROUND_ENDED = 4;
const GAME_OVER = 5;

/**
 * Game State Object
 * @param io socket.io Instance
 * @param id socket.io Channel Name
 * @constructor
 */
function Room(io,id, settings) {
  rooms[id] = this;
  this.io = io;
  this.id = id || roomUtil.generateName();
  this.drawer = null;
  this.state = NOT_STARTED;
  this.currentWord = '';
  this.wordTheme = wordlist.DEFAULT_THEME; // can be overridden by user settings
  this.users = [];
  this.score = {};
  this.names = {};
  this.pointsEarned = {};
  this.timeOut = {};
  this.clicks = [];
  this.hintsGiven = 0;
  this.roundTimerID;
  this.roundEndTime = 0;
  this.minPlayers = 2;
  this.timeLimit = 60;
  this.hasTeams = false;
  this.teams = null;
  // copy across user-defined settings
  console.log(settings);
  Object.assign(this, settings);
  if (this.hasTeams) {
    this.numTeams = 2;
    this.teams = {
      1: [], 
      2: []
    };
  }
}

Room.prototype = {
  currentDrawer,
  endRound,
  nextRound,
  setRoundTimer,
  clearRoundTimer,
  addUser,
  disconnectUser,
  reconnectUser,
  enoughPlayers,
  getUserTeam,
  getState,
  awardPoints,
  addScore,
  addClick,
  clearClicks,
  hasName
};

module.exports = function (io) {
  return {
    createClient: function (socket,session,id) {
      return new Client(io,socket,session,id);
    },
    createRoom: function (id, settings) {
      return new Room(io, id, settings);
    },
    getRoom: function (id) {
      return rooms.hasOwnProperty(id) ? rooms[id] : this.createRoom(id, {});
    }
  };
};
