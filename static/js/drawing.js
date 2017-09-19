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
  function Whiteboard(element,options) {
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
  Whiteboard.prototype = {
    /*
     * Setup the whiteboard, and drawing mechanism
     */
    _init: function () {
      let context = this.element.getContext('2d');
      let plugin = this;
      $(this.element).attr("width", $(this.element).outerWidth()).attr("height", this.element.width);
      if (context) {
        let paint;

        let offsetLeft = 0, offsetTop = 0; // relative to whole page
        let height = 0, width = 0;
        /*
         * Listeners for mouse events
         */
        if (this.options.draw) {
          $(this.element).mousedown(function (e) {
            $(plugin.element).attr("width", $(plugin.element).outerWidth()).attr("height", plugin.element.width);
            /*
             * Calculates offset of canvas relative to whole page
             * Check every mousedown in case of resize
             */
            let a = this;
            let height = this.height, width = this.width;
            offsetLeft = 0;
            offsetTop = 0;
            while (a) {
              offsetLeft += a.offsetLeft;
              offsetTop += a.offsetTop;
              a = a.offsetParent;
            }

            const mouseX = (e.pageX - offsetLeft) / height;
            const mouseY = (e.pageY - offsetTop) / width;
            // console.log("MD X:" + mouseX + " Y:" + mouseY)
            paint = true;
            plugin.addClick(mouseX, mouseY);
            plugin.redraw();
            plugin.options.socket.emit('draw', {
              x: mouseX,
              y: mouseY,
              drag: false
            });
          }).mousemove(function (e) {
            if (paint) {
              let height = this.height, width = this.width;
              const mouseX = (e.pageX - offsetLeft) / height;
              const mouseY = (e.pageY - offsetTop) / width;
              // console.log("MM X:" + mouseX + " Y:" + mouseY)
              plugin.addClick(mouseX, mouseY, true);
              plugin.redraw();
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
          plugin.addClick(data.x, data.y, data.drag);
          plugin.redraw();
        });
      }
    },

    /*
     * Adds a mouse movement to the clicks array
     */
    addClick: function (x, y, dragging) {
      this.clicks.push({
        x, y, dragging
      })
    },

    /*
     * Clears the canvas and redraws all recorded mouse movements
     */
    redraw: function () {
      let context = this.element.getContext('2d');
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
      context.lineJoin = "round";
      context.lineWidth = 5;
      context.strokeStyle = "#000000";
      let height = this.element.height, width = this.element.width;
      for (let i = 0; i < this.clicks.length; i++) {
        context.beginPath();
        if (this.clicks[i].dragging && i) {
          context.moveTo(this.clicks[i - 1].x * width, this.clicks[i - 1].y * height);
        } else {
          context.moveTo(this.clicks[i].x * width - 1, this.clicks[i].y * height);
        }
        context.lineTo(this.clicks[i].x * width, this.clicks[i].y * height);
        context.closePath();
        context.stroke();
      }
    },

    /*
     * TODO: Implement clear Function
     */
    clear: function() {}
  };

  /*
   * Wrapper for Whiteboard Plugin
   */
  $.fn.pictWhiteboard = function (options) {
    let ret;
    this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName,
          new Whiteboard(this, options));
      }
      ret = $.data(this, "plugin_" + pluginName)
    });
    return ret;
  }
})(jQuery);