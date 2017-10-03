(($) => {
  /*
   * Plugin details
   */
  var pluginName = "pictWhiteboard",
    defaults = {
      colors:['black','gray','red','purple','green','yellow','blue','orange','fuchsia','lime','teal','aqua'],
      tools:['pencil','eraser','fill','line','rectangle','circle'],
      sizes:[{name:'small',size:'5'},{name:'normal',size:'10'},{name:'large',size:'20'}],
    },
    shapes = ['rectangle','circle','line'];

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
    this.drawing = true;
    this.drawingTool = 'pencil';
    this.isFilled = false;
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
          if (!plugin.drawing)
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
          if (shapes.includes(plugin.drawingTool)) {
            plugin.startX = mouseX;
            plugin.startY = mouseY;
            socket.emit('draw', {
              status: 'start', x: mouseX, y: mouseY,
              tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
              fill: plugin.isFilled,
            })
          } else {
            socket.emit('draw', {
              x: mouseX, y: mouseY, drag: false,
              tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
            });
          }
        }).mousemove(function (e) {
          if (!plugin.drawing)
            return;
          if (paint) {
            let height = this.height, width = this.width;
            const mouseX = (e.pageX - offsetLeft) / height;
            const mouseY = (e.pageY - offsetTop) / width;
            // console.log("MM X:" + mouseX + " Y:" + mouseY)
            if (shapes.includes(plugin.drawingTool)) {
              socket.emit('draw', {
                status: 'draw', startX: plugin.startX, startY: plugin.startY, x: mouseX, y: mouseY,
                tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
                fill: plugin.isFilled,
              })
            } else {
              socket.emit('draw', {
                x: mouseX, y: mouseY, drag: true,
                tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
              });
            }
          }
        }).mouseleave(function (e) {
          // console.log("ML")
          if (paint && shapes.includes(plugin.drawingTool)) {
            let height = this.height, width = this.width;
            const mouseX = (e.pageX - offsetLeft) / height;
            const mouseY = (e.pageY - offsetTop) / width;
            socket.emit('draw', {
              status: 'cancel',
              tool: plugin.drawingTool,
            });
          }
          paint = false;
        }).mouseup(function (e) {
          // console.log("MU")
          if (paint && shapes.includes(plugin.drawingTool)) {
            let height = this.height, width = this.width;
            const mouseX = (e.pageX - offsetLeft) / height;
            const mouseY = (e.pageY - offsetTop) / width;
            socket.emit('draw', {
              status: 'end',
              tool: plugin.drawingTool,
              startX: plugin.startX, startY: plugin.startY,
              x: mouseX, y: mouseY, color: plugin.color, width: plugin.width,
              fill: plugin.isFilled,
            });
          }
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
          // console.log(data);
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
      toolPicker.append($('<label>').append($('<input type="checkbox">').click(function() {
        plugin.isFilled = this.checked;
      })).append(" Fill Shape"));
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
      context.lineJoin = "round";
      let height = this.element.height, width = this.element.width;
      for (let i = 0; i < this.clicks.length; i++) {
        let click = this.clicks[i], x = click.x * width, y = click.y * height;
        let startX = click.startX * width, startY = click.startY * height;
        context.lineWidth = click.width;
        context.strokeStyle = click.color;
        context.fillStyle = click.color;
        switch (click.tool) {
          case 'eraser':
            context.strokeStyle = 'white';
          case 'pencil':
            context.beginPath();
            if (click.drag && i) {
              context.moveTo(this.clicks[i - 1].x * width, this.clicks[i - 1].y * height);
            } else {
              context.moveTo(x - 1, y);
            }
            context.lineTo(x,y);
            context.closePath();
            context.stroke();
            break;
          case 'fill':
            context.putImageData(this.imageData,0,0);
            break;
          case 'line':
            context.beginPath();
            if (click.status == "start") {
              context.moveTo(x - 1, y);
            } else {
              context.moveTo(startX, startY);
            }
            context.lineTo(x, y);
            context.closePath();
            context.stroke();
            break;
          case 'rectangle':
            if (click.status == "cancel")
              break;
            if (click.status == "start") {
              context.fillRect(startX, startY,1,1);
            } else {
              if (click.fill)
                context.fillRect(Math.min(startX,x),Math.min(startY,y),
                  Math.abs(startX - x),Math.abs(startY - y));
              else
                context.strokeRect(Math.min(startX,x),Math.min(startY,y),
                  Math.abs(startX - x),Math.abs(startY - y));
            }
            break;
          case 'circle':
            console.log(click)
            let radiusX = Math.abs(startX - x)/2, radiusY = Math.abs(startY - y)/2;
            let centerX = (startX + x)/2, centerY = (startY + y)/2;
            let steps = 100;
            context.beginPath();
            context.moveTo(radiusX * Math.cos(0) + centerX, radiusY * Math.sin(0) + centerY);
            for (let i = 0; i < steps; i++) {
              context.lineTo(radiusX * Math.cos(2*Math.PI*i/steps) + centerX, radiusY * Math.sin(2*Math.PI*i/steps) + centerY);
            }
            context.closePath();
            context.stroke();
            if (click.fill)
              context.fill();
        }
        if (shapes.includes(click.tool) && click.status != "end") {
          this.clicks.splice(i);
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
      let fillColor = getRgbArray(click.color,true);
      fillColor[3] *= 255;
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
    },

    setDrawable: function (draw) {
      this.drawing = draw;
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