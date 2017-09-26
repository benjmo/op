/**
 * File for functions that handle socket.io events related to the game
 */

const util = require('./util');
const wordlist = require('./wordlist');
const WIN_SCORE = 5;

let rooms = {};

/*
 * Attempt to handle lobbies/rooms
 */
const joinRoom = function (room) {
  this.socket.join(room.id);
  this.room = room;
  this.name = room.addUser(this.socket.id);
  this.socket.emit('gameDetails',room.getState());
  this.socket.broadcast.to(room.id).emit('chatMessage', 'a new user has joined the room'); // broadcast to everyone in the room
};

const leaveRoom = function () {
  if (this.room)
    this.socket.leave(this.room.id, () => {
      this.room.removeUser(this.socket.id);
    })
};

/**
 * Handle user drawing
 */
const draw = function (data) {
  if (this.room && (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null)) {
    this.io.to(this.room.id).emit('draw', data);
    this.room.addClick(data);
  }
};

/**
 * Clear drawing
 */
const clearDrawing = function () {
  if (this.room && (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null)) {
    this.room.clearClicks();
  }
};

/**
 * Handle messaging
 */
const chatMessage = function (data) {
  let socket = this.socket, io = this.io, room = this.room;
  let drawing = this.room.currentDrawer() == this.socket.id;
  if (room.checkGuess(data, socket.id) == util.CORRECT_GUESS) {
    if (drawing) {
      socket.emit('chatMessage',"Please don't reveal the word in chat");
    } else {
      socket.broadcast.to(room.id).emit('chatMessage', `${this.name} guessed the word: ${data}.`); //to everyone else
      socket.emit('chatMessage', `You guessed the word: ${data}!`) //to self
    }
  } else if (room.checkGuess(data, socket.id) == util.CLOSE_GUESS) {
    if (drawing) {
      socket.emit('chatMessage',"Please don't reveal the word in chat");
    } else {
      socket.emit('chatMessage', `${data} is close!`) //to self
    }
  } else {
    io.to(room.id).emit('chatMessage', `${this.name}: ${data}`);
  }
};

/**
 * Handle name setting
 */
const nameMessage = function () {
  // Get username from user
  var name = ""
  this.socket.on('nameMessage', (username) => {
    // Set if unique, ask again if not
    var unique = false;
    while (!unique) {
      if (this.names.includes(username)) {
        this.socket.emit('nameMessage', 'notUnique');
      } else {
        this.socket.emit('nameMessage', 'Unique');
        name = username;
        unique = true;
      }
    }      
  });
  
  return name;
};

/**
 * Skip current users drawing turn
 */
const skipDrawing = function () {
  if (this.room.currentDrawer() == this.socket.id || this.room.currentDrawer() == null)
    this.room.nextRound();
};

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
  clearDrawing
};

const currentDrawer = function() {
  return this.drawer;
};

const checkGuess = function(guess,id) {
  drawing = (this.drawer == id);

  let result = util.checkGuess(this.currentWord,guess);
  if (result == util.CORRECT_GUESS && !drawing) {
    this.endRound(id);
  }
  return result;
};

const endRound = function(winner) {
  if (winner) {
    let name = this.names[winner];
    this.score[name]++;
    this.io.to(this.id).emit('updateScore',this.score);
    if (this.score[name] >= WIN_SCORE) {
      this.state = GAME_OVER;
    } else {
      this.state = ROUND_ENDED;
      this.nextRound();
    }
  } else {
    this.state = ROUND_ENDED;
    this.nextRound();
  }
};

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

const addUser = function(user, name = "anon"+Math.trunc(Math.random()*10000)) { //TODO call name thing here
  this.users.push(user);
  this.names[user] = name;
  this.score[name] = 0;
  this.io.to(this.id).emit('newUser',this.score);
  if (this.state == NOT_STARTED || this.state == WAITING) {
    this.nextRound();
  }
  return name;
};

const removeUser = function(user) {
  this.users.splice(this.users.indexOf(user),1);
  delete this.score[this.names[user]];
  delete this.names[user];
  if (user == this.drawer || this.users.length <= 1) {
    this.endRound();
  }
};

const getState = function () {
  return {
    drawer: this.drawer,
    state: this.state,
    names: this.names,
    score: this.score,
    clicks: this.clicks
  }
};

const addClick = function (data) {
  this.clicks.push(data);
};

const clearClicks = function () {
  this.clicks = [];
  this.io.to(this.id).emit('clear');
};

const NOT_STARTED = 0;
const WAITING = 1;
const STARTING = 2;
const IN_PROGRESS = 3;
const ROUND_ENDED = 4;
const GAME_OVER = 5;

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
}

Room.prototype = {
  currentDrawer,
  nextRound,
  addUser,
  removeUser,
  getState,
  addClick,
  clearClicks,
  endRound,
  checkGuess
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
