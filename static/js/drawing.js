(($) => {
  $.fn.pictWhiteboard = function (options) {
    let opt = $.extend({}, $.fn.pictWhiteboard.defaults, options);
    this.each((it) => {
      let context = this[it].getContext('2d');
      if (context) {
        let clickX = [];
        let clickY = [];
        let clickDrag = [];
        let paint;

        const addClick = function (x, y, dragging) {
          clickX.push(x);
          clickY.push(y);
          clickDrag.push(dragging);
        }

        const redraw = function () {
          context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

          context.strokeStyle = "#df4b26";
          context.lineJoin = "round";
          context.lineWidth = 5;

          for (let i = 0; i < clickX.length; i++) {
            context.beginPath();
            if (clickDrag[i] && i) {
              context.moveTo(clickX[i - 1], clickY[i - 1]);
            } else {
              context.moveTo(clickX[i] - 1, clickY[i]);
            }
            context.lineTo(clickX[i], clickY[i]);
            context.closePath();
            context.stroke();
          }
        }

        let offsetLeft = 0, offsetTop = 0, a = this[it];
        while (a) {
          offsetLeft += a.offsetLeft;
          offsetTop += a.offsetTop;
          a = a.offsetParent;
        }
        if (opt.draw) {
          this.mousedown(function (e) {
            console.log(this.offsetLeft);
            const mouseX = e.pageX - offsetLeft;
            const mouseY = e.pageY - offsetTop;
            console.log("MD X:" + mouseX + " Y:" + mouseY)
            paint = true;
            addClick(e.pageX - offsetLeft, e.pageY - offsetTop);
            redraw();
            opt.socket.emit('draw', {
              x: mouseX,
              y: mouseY,
              drag: false
            });
          }).mousemove(function (e) {
            if (paint) {
              const mouseX = e.pageX - offsetLeft;
              const mouseY = e.pageY - offsetTop;
              console.log("MM X:" + mouseX + " Y:" + mouseY)
              addClick(e.pageX - offsetLeft, e.pageY - offsetTop, true);
              redraw();
              opt.socket.emit('draw', {
                x: mouseX,
                y: mouseY,
                drag: true
              });
            }
          }).mouseleave(function (e) {
            console.log("ML")
            paint = false;
          }).mouseup(function (e) {
            console.log("MU")
            paint = false;
          });
        }
        opt.socket.on('draw', function (data) {
          addClick(data.x, data.y, data.drag);
          redraw();
        });
      }
    });
  };

  $.fn.pictWhiteboard.defaults = {
    socket: io(),
    draw: false
  };
})(jQuery);