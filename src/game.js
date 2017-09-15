/**
 * File for functions that handle socket.io events related to the game
 */

let rooms = {};
/*
 * Attempt to handle lobbies/rooms
 */
const join_room = (io,socket,data) => {
    console.log(data)
    socket.join(data, () => {
        if (!(data in rooms))
            rooms[data] = [];
        rooms[data].push(socket.id);
        socket.broadcast.to(data).emit('chat_message','a new user has joined the room'); // broadcast to everyone in the room
    });
};

/**
 * Handle user drawing
 */
const draw = (io,socket,data) => {
    if (Object.keys(socket.rooms).length > 1) {
        for (room of Object.keys(socket.rooms))
            if (room !== socket.id)
                socket.broadcast.to(room).emit('draw', data);
    } else
        io.emit('draw',data);

};

/**
 * Handle messaging
 */
const chat_message = (io,socket,data) => {
    if (data.match(/^!guess /)) {
        let guess = data.replace(/^!guess /,"");
        for (room of Object.keys(socket.rooms))
            if (room !== socket.id)
                io.to(room).emit('chat_message', "You Guessed ${guess}");
    } else if (data.match(/^!join /)) {
        let room = data.replace(/^!join /,"");
        join_room(io,socket,room);
    } else {
        console.log(Object.keys(socket.rooms))
        if (Object.keys(socket.rooms).length > 1) {
            for (room of Object.keys(socket.rooms))
                if (room !== socket.id) {
                    console.log(room)
                    io.to(room).emit('chat_message',data);
                }
        } else
            io.emit('chat_message',data);
    }
};

module.exports = function(io) {
    return {
        chat_message: chat_message.bind(this, io),
        draw: draw.bind(this, io),
        join_room: join_room.bind(this, io),
    };
};
