/**
 * File for functions that handle socket.io events related to the game
 */

/**
 * Handle user drawing
 */
const draw = function(io, data) {
    console.log(data);
    io.emit('draw', data);
};

module.exports = function(io) {
    return {
        draw: draw.bind(this, io)
    };
};
