/**
 * File for functions that handle socket.io events related to the game
 */

let util = require('./util');
let rooms = {};

/*
 * Attempt to handle lobbies/rooms
 */
const join_room = function (room) {
  this.socket.join(room.id, () => {
    this.name = room.add_user(this.socket.id);
    this.room = room;
    this.socket.emit('game_details',room.getState());
    this.socket.broadcast.to(room.id).emit('chat_message', 'a new user has joined the room'); // broadcast to everyone in the room
  });
};

const leave_room = function () {
  if (this.room)
    this.socket.leave(this.room.id, () => {
      this.room.remove_user(this.socket.id);
    })
};

/**
 * Handle user drawing
 */
const draw = function (data) {
  if (this.room.current_drawer() == this.socket.id)
    for (let room of Object.keys(this.socket.rooms))
      this.socket.broadcast.to(room).emit('draw', data);
};

/**
 * Handle messaging
 */
const chat_message = function (data) {
  let socket = this.socket, io = this.io, room = this.room.id;
  if (util.check_guess("",data)) {
    socket.broadcast.to(room).emit('chat_message', `Someone Guessed ${guess}`); //to everyone else
    socket.emit('chat_message', `You Guessed ${guess}`) //to self
  } else if (data.match(/^!join /)) {
    let room = data.replace(/^!join /, "");
    join_room(io, socket, room);
  } else {
    io.to(room).emit('chat_message', `${this.name}: ${data}`);
  }
};

/**
 * Skip current users drawing turn
 */
const skip_drawing = function () {
  if (this.room.current_drawer() == this.socket.id || this.room.current_drawer() == null)
    this.room.next_game();
};

function Client(io,socket) {
  this.io = io;
  this.socket = socket;
  this.room = null;
  this.name = null;
}

Client.prototype = {
  skip_drawing,
  chat_message,
  draw,
  join_room,
  leave_room
};

const current_drawer = function() {
  return this.drawer;
};

const next_game = function() {
  let users = this.users, io = this.io;
  if (this.drawer == null)
    this.drawer = users[0];
  else
    this.drawer = users[(users.indexOf(this.drawer)+1) % users.length];
  this.state = STARTING;
  this.io.to(this.id).emit('next_game');
  setTimeout(() => {
    this.io.to(this.id).emit('next_game', {
      drawer: this.drawer,
      drawer_name: this.names[this.drawer],
      score: this.score
    });
    this.state = IN_PROGRESS;
  },5000);
};

const add_user = function(user, name = "anon"+Math.trunc(Math.random()*10000)) {
  this.users.push(user);
  this.names[user] = name;
  this.score[user] = 0;
  return name;
};

const remove_user = function(user) {
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
  this.users = [];
  this.score = {};
  this.names = {};
}

Room.prototype = {
  current_drawer,
  next_game,
  add_user,
  remove_user,
  getState
};

module.exports = function (io) {
  return {
    create_client: function (socket) {
      return new Client(io,socket);
    },
    create_room: function (id) {
      return new Room(io, id);
    },
    get_room: function (id) {
      return rooms.hasOwnProperty(id) ? rooms[id] : this.create_room(id);
    }
  };
};
