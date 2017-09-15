(($) => {
  function scrollBottom() {
    if (!preventNewScroll) { // if mouse is not over printer
      $printer.stop().animate({scrollTop: $printer[0].scrollHeight - printerH}, 600); // SET SCROLLER TO BOTTOM
    }
  }

  $.fn.pictMessenger = function (options) {
    let opts = $.extend({}, $.fn.pictMessenger.defaults, options);
    return this.each(() => {
      let inputForm = $('<form>').append($('<input>')).append($('<button>').text('Send'));
      let messageDiv = $('<ul>');
      this.append(messageDiv).append(inputForm);
      messageDiv.height($(window).height() * opts.height / 100 - inputForm.height());
      let printerH = messageDiv.innerHeight(),
        preventNewScroll = false;
      let scrollBottom = () => {
        if (!preventNewScroll) { // if mouse is not over printer
          messageDiv.stop().animate({scrollTop: messageDiv[0].scrollHeight - printerH}, 250); // SET SCROLLER TO BOTTOM
        }
      };

      messageDiv.hover(function (e) {
        preventNewScroll = e.type == 'mouseenter' ? true : false;
        if (!preventNewScroll) {
          scrollBottom();
        } // On mouseleave go to bottom
      });

      scrollBottom();

      inputForm.submit(() => {
        let msg = $(this).find('input');
        if (msg.val().trim() != '') {
          opts.socket.emit('chat_message', msg.val());
          msg.val('');
        }
        return false;
      });
      opts.socket.on('chat_message', (msg) => {
        messageDiv.append($('<li>').text(msg));
        scrollBottom();
      });
    });
  };

  $.fn.pictMessenger.defaults = {
    socket: io(),
    height: 33
  };
})(jQuery);