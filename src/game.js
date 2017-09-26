/**
 * File for functions that handle socket.io events related to the game
 */

const util = require('./util');
const wordlist = require('./wordlist');
let rooms = {};

/*
 * Attempt to handle lobbies/rooms
 */
const joinRoom = function (room) {
  this.socket.join(room.id, () => {
    this.name = room.addUser(this.socket.id);
    this.room = room;
    this.socket.emit('game_details',room.getState());
    this.socket.broadcast.to(room.id).emit('chatMessage', 'a new user has joined the room'); // broadcast to everyone in the room
  });
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
  if (this.room && this.room.currentDrawer() == this.socket.id)
    for (let room of Object.keys(this.socket.rooms))
      this.socket.broadcast.to(room).emit('draw', data);
};

/**
 * Handle messaging
 */
const chatMessage = function (data) {
  let socket = this.socket, io = this.io, room = this.room;
  if (util.checkGuess(room.currentWord, data)) {
    socket.broadcast.to(room.id).emit('chatMessage', `${this.name} guessed ${data}`); //to everyone else
    socket.emit('chatMessage', `You guessed ${data}`) //to self
  } else if (util.closeGuess(room.currentWord, data)) {
    socket.broadcast.to(room.id).emit('chatMessage', `${this.name} guessed ${data}`); //to everyone else
    socket.emit('chatMessage', `Your guess ${data} is close`) //to self
  } else {
    io.to(room.id).emit('chatMessage', `${this.name}: ${data}`);
  }
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
  leaveRoom
};

const currentDrawer = function() {
  return this.drawer;
};

const nextRound = function() {
  let users = this.users, io = this.io;
  if (this.drawer == null)
    this.drawer = users[0];
  else
    this.drawer = users[(users.indexOf(this.drawer)+1) % users.length];
  this.state = STARTING;
  this.currentWord = wordlist.getRandomWord();
  this.io.to(this.id).emit('nextRound');
  setTimeout(() => {
    this.io.to(this.id).emit('nextRound', {
      drawer: this.drawer,
      drawerName: this.names[this.drawer],
      currentWord: this.currentWord,
      score: this.score
    });
    this.state = IN_PROGRESS;
  },5000);
};

/**
 * Usernames
 */
// const get_username = function () {
//   let username = prompt("Please enter your name:", "anon"+Math.trunc(Math.random()*10000));
//   return username;
// };

const addUser = function(user, name = "anon"+Math.trunc(Math.random()*10000)) {
  this.users.push(user);
  this.names[user] = name;
  this.score[user] = 0;
  return name;
};

const removeUser = function(user) {
  this.users.splice(this.users.indexOf(user),0);
  delete this.names[user];
  delete this.score[user];
};

const getState = function () {
  return {
    drawer: this.drawer,
    state: this.state,
    names: this.names,
    score: this.score
  }
};

const NOT_STARTED = 0;
const STARTING = 1;
const IN_PROGRESS = 2;
const ROUND_ENDED = 3;
const GAME_OVER = 4;

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
}

Room.prototype = {
  currentDrawer,
  nextRound,
  addUser,
  removeUser,
  getState
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
