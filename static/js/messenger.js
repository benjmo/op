(($) => {
  function scrollBottom() {
    if (!preventNewScroll) { // if mouse is not over printer
      $printer.stop().animate({scrollTop: $printer[0].scrollHeight - printerH}, 600); // SET SCROLLER TO BOTTOM
    }
  }

  $.fn.pictMessenger = function (options) {
    let opts = $.extend({}, $.fn.pictMessenger.defaults, options);
    return this.each(() => {
      let inputForm = $('<form>').height($(window).height() * opts.height /100 * opts.inputHeight / 100).addClass('input-group').append(
        $('<input>').height('100%').addClass('form-control')).append(
          $('<div>').width('1%').addClass('input-group-btn').append(
            $('<button>').height('100%').attr('type','submit').addClass('btn btn-default').append(
              $('<i>').addClass('glyphicon glyphicon-search')
            )));
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
          opts.socket.emit('chatMessage', msg.val());
          msg.val('');
        }
        return false;
      });
      opts.socket.on('chatMessage', (msg) => {
        messageDiv.append($('<li>').append(msg));
        scrollBottom();
      });
    });
  };

  $.fn.pictMessenger.defaults = {
    height: 33,
    inputHeight: 1,
  };
})(jQuery);
