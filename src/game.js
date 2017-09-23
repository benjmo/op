/**
 * File for functions that handle socket.io events related to the game
 */

let rooms = {};
/*
 * Attempt to handle lobbies/rooms
 */
const join_room = function (data) {
  this.socket.join(data, () => {
    if (!(data in rooms))
      rooms[data] = [];
    rooms[data].push(this.socket.id);
    this.socket.broadcast.to(data).emit('chat_message', 'a new user has joined the room'); // broadcast to everyone in the room
  });
};

/**
 * Handle user drawing
 */
const draw = function (data) {
  for (let room of Object.keys(this.socket.rooms))
    this.socket.broadcast.to(room).emit('draw', data);
};

/**
 * Handle messaging
 */
const chat_message = function (data) {
  let socket = this.socket, io = this.io;
  if (data.match(/^!guess /)) {
    let guess = data.replace(/^!guess /, "");
    for (let room of Object.keys(socket.rooms))
      socket.broadcast.to(room).emit('chat_message', `Someone Guessed ${guess}`); //to everyone else
    socket.emit('chat_message', `You Guessed ${guess}`) //to self
  } else if (data.match(/^!join /)) {
    let room = data.replace(/^!join /, "");
    join_room(io, socket, room);
  } else {
    for (let room of Object.keys(socket.rooms))
      if (room != socket.id)
        io.to(room).emit('chat_message', data);
  }
};

module.exports = function (io) {
  return {
    create_client: function (socket) {
      return {io,
        socket,
        chat_message,
        draw,
        join_room
      }
    }
  };
};
