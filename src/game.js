/**
 * File for functions that handle socket.io events related to the game
 */

const util = require('./util');
const wordlist = require('./wordlist');
const WIN_SCORE = 5;

let rooms = {};

/**
 * Subscribe the client's socket to the given room's channel
 * @param room Room object
 */
const joinRoom = function (room) {
  this.socket.join(room.id);
  this.room = room;
};

/**
 * Leave the channel the client is currently in
 */
const leaveRoom = function () {
  if (this.room)
    this.socket.leave(this.room.id, () => {
      this.room.removeUser(this.socket.id);
    })
};

/**
 * Draw the given mouse action on the whiteboard
 * Only allows the current drawer to draw, unless noone has been assigned yet
 * @param data Mouse action including x, y, action type
 */
const draw = function (data) {
  if (this.room && (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null)) {
    this.io.to(this.room.id).emit('draw', data);
    this.room.addClick(data);
  }
};

/**
 * Clear the drawing
 * Only allows the current drawer to clear, unless noone has been assigned yet
 */
const clearDrawing = function () {
  if (this.room && (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null)) {
    this.room.clearClicks();
  }
};

const giveHint = function() {
  if (this.room && (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null) &&
      this.room.hintsGiven < 3) {
    let hint = util.giveHint(this.room.currentWord, this.room.hintsGiven);
    this.socket.emit('hint', hint);
    this.room.hintsGiven++;
  }
}

/**
 * Send a chat message to all clients
 * Also checks if the chat message has guessed the current word
 * @param data Chat Message
 */
const chatMessage = function (data) {
  let socket = this.socket, io = this.io, room = this.room;
  let drawing = this.room.currentDrawer() == this.socket.id;
  if (room.checkGuess(data, socket.id) == util.CORRECT_GUESS) {
    if (drawing) {
      socket.emit('chatMessage','Please don\'t reveal the word in chat');
    } else {
      socket.broadcast.to(room.id).emit('chatMessage', `${this.name} guessed the word: ${data}.`); //to everyone else
      socket.emit('chatMessage', `You guessed the word: ${data}!`) //to self
    }
  } else if (room.checkGuess(data, socket.id) == util.CLOSE_GUESS) {
    if (drawing) {
      socket.emit('chatMessage','Please don\'t reveal the word in chat');
    } else {
      socket.emit('chatMessage', `${data} is close!`) //to self
    }
  } else {
    io.to(room.id).emit('chatMessage', `${this.name}: ${data}`);
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
  let unique = !room.hasName(name);
  if (unique) {
    this.name = name;
    room.addUser(this.socket.id,this.name)
    this.socket.emit('gameDetails',room.getState());
    this.socket.broadcast.to(room.id).emit('chatMessage', `${this.name} has joined the room`); // broadcast to everyone in the room
  }
  return unique;
};

/**
 * Skip current users drawing turn
 */
const skipDrawing = function () {
  if (this.room && (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null))
    this.room.nextRound();
};

/**
 * Client Object
 * @param io socket.io instance
 * @param socket socket.io socket of client
 * @constructor
 */
function Client(io,socket) {
  this.io = io;
  this.socket = socket;
  this.room = null;
  this.name = null;
}

Client.prototype = {
  skipDrawing,
  chatMessage,
  draw,
  joinRoom,
  leaveRoom,
  clearDrawing,
  nameMessage,
  giveHint
};

/**
 * Returns the current drawers ID
 * @returns {*|null} Drawer ID or null if not set
 */
const currentDrawer = function() {
  return this.drawer;
};

/**
 * Check whether the guess matches the current word
 * @param guess The word guessed
 * @param id The client's ID
 * @returns {*} How close the guess is
 */
const checkGuess = function(guess,id) {
  let drawing = (this.drawer == id);
  let result = util.checkGuess(this.currentWord,guess);
  if (result == util.CORRECT_GUESS && !drawing) {
    this.endRound(id);
  }
  return result;
};

/**
 * Ends the current round and updates the score
 * @param winner The winner of the round, or null if no one won
 */
const endRound = function(winner) {
  this.state = ROUND_ENDED;
  if (winner) {
    this.addScore(winner, 1);
    this.addScore(this.drawer, 1);
    this.io.to(this.id).emit('updateScore',this.score);
  }
  // move to round if game isn't over
  if (this.state === ROUND_ENDED)
    this.nextRound();
};

/**
 * Starts the next round if there are enough players and updates the game state
 */
const nextRound = function() {
  let users = this.users, io = this.io, room = this;
  console.log(users);
  if (users.length <= 1) {
    this.state = WAITING;
    this.io.to(this.id).emit('status',WAITING);
    return;
  }
  if (this.drawer == null)
    this.drawer = users[0];
  else
    this.drawer = users[(users.indexOf(this.drawer)+1) % users.length];
  this.clicks = [];
  this.currentWord = wordlist.getRandomWord();
  this.hintsGiven = 0;
  io.to(this.id).emit('nextRound');
  setTimeout(function() {
    io.to(room.id).emit('nextRound', {
      drawer: room.drawer,
      drawerName: room.names[room.drawer],
      currentWord: room.currentWord,
      score: room.score
    });
    room.state = IN_PROGRESS;
  },5000);
};

/**
 * Gives points to a user
 * @param user - user's ID
 * @param score - score to add
 */
const addScore = function(user, score) {
  const name = this.names[user];
  this.score[name] += score;
  if (this.score[name] >= WIN_SCORE) {
    this.state = GAME_OVER;
  }
}

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
  this.io.to(this.id).emit('updateScore',this.score);
  if (this.state == NOT_STARTED || this.state == WAITING) {
    this.nextRound();
  }
};

/**
 * Remove a user's information from the game
 * Also ends the current round with no winner if they were they drawer,
 * or there are not enough players remaining
 * @param user User's ID
 */
const removeUser = function(user) {
  this.users.splice(this.users.indexOf(user),1);
  delete this.score[this.names[user]];
  delete this.names[user];
  if (user == this.drawer || this.users.length <= 1) {
    this.endRound();
    this.clearClicks();
  }
};

/**
 * Gets the current game state
 * @returns {{drawer: *, state: *, names: *, score: *, clicks: *}}
 */
const getState = function () {
  return {
    drawer: this.drawer,
    state: this.state,
    names: this.names,
    score: this.score,
    clicks: this.clicks
  }
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
function Room(io,id) {
  rooms[id] = this;
  this.io = io;
  this.id = id;
  this.drawer = null;
  this.state = NOT_STARTED;
  this.currentWord = '';
  this.users = [];
  this.score = {};
  this.names = {};
  this.clicks = [];
  this.hintsGiven = 0;
}

Room.prototype = {
  currentDrawer,
  nextRound,
  addUser,
  removeUser,
  getState,
  addScore,
  addClick,
  clearClicks,
  endRound,
  checkGuess,
  hasName
};

module.exports = function (io) {
  return {
    createClient: function (socket) {
      return new Client(io,socket);
    },
    createRoom: function (id) {
      return new Room(io, id);
    },
    getRoom: function (id) {
      return rooms.hasOwnProperty(id) ? rooms[id] : this.createRoom(id);
    }
  };
};
