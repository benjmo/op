

function scrollBottom(){
  if(!preventNewScroll){ // if mouse is not over printer
    $printer.stop().animate( {scrollTop: $printer[0].scrollHeight - printerH  }, 600); // SET SCROLLER TO BOTTOM
  }
}

function initMessenger(messageDiv,inputForm,msg,socket) {
  let printerH  = messageDiv.innerHeight(),
  preventNewScroll = false;
  let scrollBottom = () => {
    if(!preventNewScroll){ // if mouse is not over printer
      messageDiv.stop().animate( {scrollTop: messageDiv[0].scrollHeight - printerH  }, 600); // SET SCROLLER TO BOTTOM
    }
  };

  messageDiv.hover(function( e ) {
    preventNewScroll = e.type=='mouseenter' ? true : false ;
    if(!preventNewScroll){ scrollBottom(); } // On mouseleave go to bottom
  });

  scrollBottom();

  inputForm.submit(()=> {
    if (msg.val().trim() != '') {
      socket.emit('chat_message', msg.val());
      msg.val('');
    }
    return false;
  });
  socket.on('chat_message',(msg) => {
    messageDiv.append($('<li>').text(msg));
    scrollBottom();
  });
}