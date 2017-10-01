(($) => {
  /*
   * Plugin details
   */
  var pluginName = "pictWhiteboard",
    defaults = {
      colors:['black','gray','red','purple','green','yellow','blue','orange','fuchsia','lime','teal','aqua'],
      tools:['pencil','eraser','fill'],
      sizes:[{name:'small',size:'1'},{name:'normal',size:'10'},{name:'large',size:'20'}],
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

  function getRgbArray(color, alpha) {
    // Always return an array, either empty or filled.
    let rgb = [];
    let hex;

    // Get an array of rgb(a) values.
    if (color.substr(0, 1) === '#') {
      /* HEX STRING */
      // If the first character is # we're dealing with a hex string. Get
      // an array of each character. This is more explicit than dealing
      // with the indices of a String object due to all other instances
      // of hex in this function.
      hex = color.substr(1).split('');
      if (hex.length === 3) {
        // If this is a 3-char color, e.g. #f00, make it 6 characters
        // by duplicating each one.
        hex = [hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]];
      }
      if (hex.length === 6) {
        // Only deal with 6-char hex colors when computing the rgb
        // array. Anything else at this point has been passed
        // incorrectly.
        let i = 0;
        let x = 0;
        let hexStr;
        // Convert each hex pair (represented by hexStr) into a decimal
        // value to go in rgb[]. i is the rgb[] index whilst x is 2i,
        // which translates Array(3) to Array(6).
        while (i < 3) {
          hexStr = hex[x] + hex[x + 1];
          rgb[i] = parseInt(hexStr, 16);
          i += 1;
          x = i * 2;
        }
      }
    } else if (color.search(/rgb/) !== -1) {
      /* RGB(A) STRING */
      rgb = color.match(/([0-9]+\.?[0-9]*)/g);
    }

    // Add or remove the alpha value.
    if (alpha && rgb.length === 3) {
      // If an alpha value has been requested and there currently isn't
      // one, add 1 as the alpha value.
      rgb.push(1);
    } else if (! alpha && rgb.length === 4) {
      // Otherwise if there's an alpha value that hasn't been requested,
      // remove it.
      rgb.pop();
    }

    // Ensure all values in rgb are decimal numbers, not strings.
    for (let i = 0; i < rgb.length; i++) {
      rgb[i] = parseInt(rgb[i], 10);
    }

    return rgb;
  }

  /*
   * Functions callable using object.pictWhiteboard().functionName()
   */
  Whiteboard.prototype = {
    /*
     * Setup the whiteboard, and drawing mechanism
     */
    _init: function () {
      let canvas = this.element, context = canvas.getContext('2d'), plugin = this, socket = this.options.socket;
      $(canvas).attr("width", $(canvas).outerWidth()).attr("height", canvas.width);
      this.imageData = context.getImageData(0,0,canvas.width,canvas.height);
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
        $(canvas).mousedown(function (e) {
          if (!plugin.options.drawing)
            return;

          //$(canvas).attr("width", $(canvas).outerWidth()).attr("height", canvas.width);
          /*
           * Calculates offset of canvas relative to whole page
           * Check every mousedown in case of resize
           */
          let a = this;
          let height = this.height, width = this.width;
          let realH = $(this).height(), realW = $(this).width();
          offsetLeft = 0;
          offsetTop = 0;
          while (a) {
            offsetLeft += a.offsetLeft;
            offsetTop += a.offsetTop;
            a = a.offsetParent;
          }

          const mouseX = (e.pageX - offsetLeft) / (realH);
          const mouseY = (e.pageY - offsetTop) / (realW);
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
          paint = false;
        }).mouseup(function (e) {
          // console.log("MU")
          paint = false;
        });

        /*
         * Listener for drawing-related actions from other users
         */
        socket.on('draw', (data) => {
          if (data.tool == 'fill') {
            console.log(data);
            this.fillCanvas(data);
          }
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
      let colorPicker = $('<div>');
      for (let color of this.options.colors) {
        colorPicker.append($('<button>').addClass('btn colorPicker').css('background-color',color));
      }
      let toolPicker = $('<div>');
      for (let tool of this.options.tools) {
        toolPicker.append($('<button>').addClass('btn toolPicker').text(tool));
      }
      let sizePicker = $('<div>');
      for (let size of this.options.sizes) {
        sizePicker.append($('<button>').addClass('btn sizePicker').text(size.name).click(function() {
          console.log(this);
          plugin.setSize(size.size);
          $(this).parent().find('.active').removeClass('active');
          $(this).addClass('active');
        }))
      }
      $(document).on('click','.colorPicker', function() {
        plugin.setColor($(this).css('background-color'));
        $(this).parent().find('.active').removeClass('active');
        $(this).addClass('active');
      }).on('click','.toolPicker', function() {
        plugin.setTool($(this).text());
        $(this).parent().find('.active').removeClass('active');
        $(this).addClass('active');
      });
      $('#drawingTools').append(colorPicker).append(toolPicker).append(sizePicker);
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
      context.fillStyle = 'white';
      context.fillRect(0,0,context.canvas.width,context.canvas.height);
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
            context.stroke();
            break;
          case 'fill':
            context.putImageData(this.imageData,0,0);
            break;
        }
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
    },

    setSize: function (size) {
      this.width = size;
    },

    fillCanvas: function (click) {
      const PIXEL_SIZE = 4;
      const fillColor = getRgbArray(click.color,true);
      const canvas = this.element;
      let stack = [{x:Math.trunc(click.x*canvas.width),y:Math.trunc(click.y*canvas.height)}];
      let ctx = canvas.getContext("2d");
      this.imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
      const isEqual = (a1,a2) => {
        if (a1.length == a2.length) {
          for (let i = 0; i < a1.length; i++) {
            if (a1[i] != a2[i])
              return false;
          }
          return true;
        }
        return false;
      };

      const getPix = (pixIdx) => {
        let ret = [];
        for (i of [...Array(fillColor.length).keys()]) {
          ret.push(this.imageData.data[pixIdx+i]);
        }
        return ret;
      };

      const fillPix = (color, pixIdx) => {
        for (let i of [...Array(PIXEL_SIZE).keys()]) {
          if (i == PIXEL_SIZE-1)
            this.imageData.data[pixIdx+i] = 255*color[i];
          else
            this.imageData.data[pixIdx+i] = color[i];
        }
      };
      let startColor = getPix(((stack[0].y * canvas.width) + stack[0].x)*PIXEL_SIZE);
      console.log(`filling ${click.x},${click.y} ${startColor} with ${fillColor}`)
      if (isEqual(startColor,fillColor))
        return;
      while (stack.length > 0) {
        let curr = stack.pop(), x = curr.x, y = curr.y;
        let pixIdx = (y*canvas.width+x) * PIXEL_SIZE;
        while (y-- >= 0 && isEqual(startColor,getPix(pixIdx))) {
          pixIdx -= canvas.width * PIXEL_SIZE;
        }
        pixIdx += canvas.width * PIXEL_SIZE;
        ++y;
        let left = false, right = false;
        while (y++ < canvas.height-1 && isEqual(startColor,getPix(pixIdx))) {
          fillPix(fillColor,pixIdx);
          if (x > 0) {
            if (isEqual(startColor,getPix(pixIdx - PIXEL_SIZE))) {
              if (!left) {
                stack.push({x:x-1,y});
                left = true;
              }
            } else if (left) {
              left = false;
            }
          }
          if (x < canvas.width-1) {
            if (isEqual(startColor,getPix(pixIdx + PIXEL_SIZE))) {
              if (!right) {
                stack.push({x:x+1,y});
                right = true;
              }
            } else if (right) {
              right = false;
            }
          }
          pixIdx += canvas.width * PIXEL_SIZE;
        }
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
          new Whiteboard(this, options));
      }
      ret = $.data(this, "plugin_" + pluginName)
    });
    return ret;
  }
})(jQuery);