function initMessenger(messageDiv,inputForm,msg,socket) {
    inputForm.submit(()=> {
        socket.emit('chat_message', msg.val());
        msg.val('');
        return false;
    });
    socket.on('chat_message',(msg) => {
        messageDiv.append($('<li>').text(msg));
    });
}