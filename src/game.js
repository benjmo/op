/**
 * File for functions that handle socket.io events related to the game
 */

/**
 * Handle user drawing
 */
const draw = function(io, data) {
    io.emit('draw', data);
};

/**
 * Handle messaging
 */
const chat_message = (io,data) => {
    console.log(data)
    io.emit('chat_message',data);
};

module.exports = function(io) {
    return {
        draw: draw.bind(this, io),
        chat_message: chat_message.bind(this, io)
    };
};
