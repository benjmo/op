(($) => {
  /*
   * Plugin details
   */
  var pluginName = "pictWhiteboard",
    defaults = {
      colors:['black','gray','red','purple','green','yellow','blue','orange','fuchsia','lime','teal','aqua'],
      tools:['pencil','eraser'],
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

    this.drawingTool = 'pencil';
    this.color = '#000000';
    this.width = 10;
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
      let context = this.element.getContext('2d'), plugin = this, socket = this.options.socket;
      $(this.element).attr("width", $(this.element).outerWidth()).attr("height", this.element.width);
      if (context) {
        let paint;
        let a = this;
        let offsetLeft = 0, offsetTop = 0; // relative to whole page
        while (a) {
          offsetLeft += a.offsetLeft;
          offsetTop += a.offsetTop;
          a = a.offsetParent;
        }
        let height = 0, width = 0;
        /*
         * Listeners for mouse events
         */
        $(this.element).mousedown(function (e) {
          if (!plugin.options.drawing)
            return;
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
          socket.emit('draw', {
            x: mouseX, y: mouseY, drag: false,
            tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
          });
        }).mousemove(function (e) {
          if (!plugin.options.drawing)
            return;
          if (paint) {
            let height = this.height, width = this.width;
            const mouseX = (e.pageX - offsetLeft) / height;
            const mouseY = (e.pageY - offsetTop) / width;
            // console.log("MM X:" + mouseX + " Y:" + mouseY)
            socket.emit('draw', {
              x: mouseX, y: mouseY, drag: true,
              tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
            });
          }
        }).mouseleave(function (e) {
          // console.log("ML")
          plugin.cursor.hide();
          paint = false;
        }).mouseup(function (e) {
          // console.log("MU")
          paint = false;
        });

        /*
         * Listener for drawing-related actions from other users
         */
        socket.on('draw', (data) => {
          plugin.addClick(data);
          plugin.redraw();
        }).on('clear', (data) => {
          // Drawing cleared by drawer, so we have to clear our board locally
          plugin.clear();
        }).on('nextRound', (data) => {
          console.log(data);
          let interval;
          if (data == null) {
            let time = 5;
            $('#pictStatus').text(`Next Round in ${time}`);
            interval = setInterval(() => {
              time-=1;
              if (time == 0) {
                clearInterval(interval);
                plugin.clear();
                return;
              }
              $('#pictStatus').text(`Next Round in ${time}`);
            },1000);
          } else {
            clearInterval(interval);
            plugin.options.drawing = data.drawer == socket.id;
            if (plugin.options.drawing) {
              $('#pictStatus').html(`Your word is <strong>${data.currentWord}</strong>`);
            } else {
              $('#pictStatus').text(`${data.drawerName}'s turn to draw`);
            }
          }
        });
      }
      let colorPicker = $();
      for (let color of this.options.colors) {
        colorPicker = colorPicker.add($('<button>').addClass('btn colorPicker').css('background-color',color));
      }
      let toolPicker = $();
      for (let tool of this.options.tools) {
        toolPicker = toolPicker.add($('<button>').addClass('btn toolPicker').text(tool));
      }
      $(document).on('click','.colorPicker', function() {
        plugin.setColor($(this).css('background-color'));
      }).on('click','.toolPicker', function() {
        plugin.setTool($(this).text());
      });
      $('#drawingTools').append(colorPicker).append(toolPicker);
    },

    /*
     * Adds a mouse movement to the clicks array
     */
    addClick: function (data) {
      this.clicks.push(data)
    },

    /*
     * Clears the canvas and redraws all recorded mouse movements
     */
    redraw: function () {
      let context = this.element.getContext('2d');
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
      let height = this.element.height, width = this.element.width;
      for (let i = 0; i < this.clicks.length; i++) {
        context.lineWidth = this.clicks[i].width;
        context.strokeStyle = this.clicks[i].color;
        switch (this.clicks[i].tool) {
          case 'eraser':
            context.strokeStyle = 'white';
          case 'pencil':
            context.lineJoin = "round";
            context.beginPath();
            if (this.clicks[i].drag && i) {
              context.moveTo(this.clicks[i - 1].x * width, this.clicks[i - 1].y * height);
            } else {
              context.moveTo(this.clicks[i].x * width - 1, this.clicks[i].y * height);
            }
            context.lineTo(this.clicks[i].x * width, this.clicks[i].y * height);
            context.closePath();
            break;
        }
        context.stroke();
      }
    },

    /*
     * Clears the board locally
     */
    clear: function() {
      this.clicks = [];
      let context = this.element.getContext('2d');
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
    },

    /*
     * Load a drawing to whiteboard
     */
    load: function (clicks) {
      this.clicks = clicks;
      this.redraw();
    },

    /**
     * Set color of tool
     * @param color Color chosen
     */
    setColor: function (color) {
      this.color = color;
    },

    /**
     * Set the drawing tool to use
     * @param tool Tool chosen
     */
    setTool: function (tool) {
      this.drawingTool = tool;
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
          new Whiteboard(this, options));
      }
      ret = $.data(this, "plugin_" + pluginName)
    });
    return ret;
  }
})(jQuery);