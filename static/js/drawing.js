(($) => {
  /*
   * Plugin details
   */
  var pluginName = "pictWhiteboard",
    defaults = {
      socket: io(),
      draw: false
    };

  /*
   * Plugin object containing details of the Whiteboad
   * clicks stores all recorded mouse movements
   * options stores the socket and draw permissions
   */
  function Plugin(element,options) {
    this.element = element;
    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.clicks = [];
    this._init();
  }

  /*
   * Functions callable using object.pictWhiteboard().functionName()
   */
  Plugin.prototype = {
    /*
     * Setup the whiteboard, and drawing mechanism
     */
    _init: function () {
      let context = this.element.getContext('2d');
      let plugin = this;
      if (context) {
        let paint;
        /*
         * Adds a mouse movement to the clicks array
         */
        const addClick = (x, y, dragging) => {
          this.clicks.push({
            x, y, dragging
          })
        };

        /*
         * Clears the canvas and redraws all recorded mouse movements
         */
        const redraw = () => {
          context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
          context.lineJoin = "round";
          context.lineWidth = 5;
          context.strokeStyle = "#000000";
          for (let i = 0; i < this.clicks.length; i++) {
            context.beginPath();
            if (this.clicks[i].dragging && i) {
              context.moveTo(this.clicks[i - 1].x, this.clicks[i - 1].y);
            } else {
              context.moveTo(this.clicks[i].x - 1, this.clicks[i].y);
            }
            context.lineTo(this.clicks[i].x, this.clicks[i].y);
            context.closePath();
            context.stroke();
          }
        };

        let offsetLeft = 0, offsetTop = 0; // relative to whole page

        /*
         * Listeners for mouse events
         */
        if (this.options.draw) {
          $(this.element).mousedown(function (e) {
            /*
             * Calculates offset of canvas relative to whole page
             * Check every mousedown in case of resize
             */
            let a = this;
            offsetLeft = 0; offsetTop = 0;
            while (a) {
              offsetLeft += a.offsetLeft;
              offsetTop += a.offsetTop;
              a = a.offsetParent;
            }

            const mouseX = e.pageX - offsetLeft;
            const mouseY = e.pageY - offsetTop;
            // console.log("MD X:" + mouseX + " Y:" + mouseY)
            paint = true;
            addClick(e.pageX - offsetLeft, e.pageY - offsetTop);
            redraw();
            plugin.options.socket.emit('draw', {
              x: mouseX,
              y: mouseY,
              drag: false
            });
          }).mousemove(function (e) {
            if (paint) {
              const mouseX = e.pageX - offsetLeft;
              const mouseY = e.pageY - offsetTop;
              // console.log("MM X:" + mouseX + " Y:" + mouseY)
              addClick(e.pageX - offsetLeft, e.pageY - offsetTop, true);
              redraw();
              plugin.options.socket.emit('draw', {
                x: mouseX,
                y: mouseY,
                drag: true
              });
            }
          }).mouseleave(function (e) {
            // console.log("ML")
            paint = false;
          }).mouseup(function (e) {
            // console.log("MU")
            paint = false;
          });
        }

        /*
         * Listener for draw's from other users
         */
        this.options.socket.on('draw', function (data) {
          addClick(data.x, data.y, data.drag);
          redraw();
        });
      }
    }
  };

  /*
   * Wrapper for Whiteboard Plugin
   */
  $.fn.pictWhiteboard = function (options) {
    let ret;
    this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName,
          new Plugin(this, options));
      }
      ret = $.data(this, "plugin_" + pluginName)
    });
    return ret;
  }
})(jQuery);