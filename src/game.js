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
 * Checks if two words are the same, or close enough to the same
 * @param {String} word
 * @param {String} guess
 */
const check_guess = function(word, guess) {
  // exact match
  if (word === guess)
    return true;

  // guess is compound word that contains the actual word, or vice versa
  // for compound words (eg. 'doorway' === 'door'), or multiple guesses at once (eg. 'cow bull' === 'cow')

  /* uncomment once we have our dictionary stuff figured out
  if (word.indexOf(guess) !== -1) {
    // strip all spaces out
    let split = word;
    split.replace(guess, '');
    split.replace(/\s/, '');
    if (ALL_WORDS.indexOf(split) !== -1)
      return true;
  }
  */

  // minor typo, up to one extra character and up to one missing character
  let wc = {};
  let diff = 0;
  // add all the letters of word1
  for (const c of word) {
    wc[c] = wc[c] ? wc[c] + 1 : 1;
  }
  // remove all the letters of word2
  for (const c of guess) {
    wc[c] = wc[c] ? wc[c] - 1 : -1;
  }
  // missing letters have value 1, extra letters have value -1, sum them
  for (const c of Object.keys(wc)) {
    diff += Math.abs(wc[c]);
  }
  return (diff > 1);
}

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
