(($) => {
  /*
   * Plugin details
   */
  var pluginName = "pictWhiteboard",
    defaults = {
      colors:['black','gray','red','purple','green','yellow','blue','orange','fuchsia','lime','teal','aqua'],
      tools:['pencil','eraser','fill','line','rectangle','circle'],
      sizes:[{name:'small',size:5},{name:'normal',size:10},{name:'large',size:20}],
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
    this.color = '#000';
    this.width = 10;
    this.clicks = [];
    this.prevClick = null;
    this.tempClicks = [];
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
  function invertColor(color) {
    let colorArr = getRgbArray(color);
    let invArr = [];
    colorArr.forEach((hex) => {
      let inv = (255-hex).toString(16);
      invArr.push("0".repeat(2-inv.length)+inv);
    });
    return '#'+invArr.join('');
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
      $(canvas).css('cursor','none');
      canvas.width = canvas.getBoundingClientRect().width;
      canvas.height = canvas.getBoundingClientRect().height;
      // $(canvas).attr("width", canvas.getBoundingClientRect().width).attr("height", canvas.getBoundingClientRect().height);
      let offsetLeft = canvas.getBoundingClientRect().left,
        offsetTop = canvas.getBoundingClientRect().top;
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
      context.fillStyle = 'white';
      context.fillRect(0,0,context.canvas.width,context.canvas.height);
      this.imageData = context.getImageData(0,0,canvas.width,canvas.height);
      if (context) {
        let paint;
        let height = 0, width = 0;
        /*
         * Listeners for mouse events
         */
        const resizeCanvas = function() {
          plugin.redraw();
        };
        let resizeTimeout;
        $(window).resize(function() {
          clearTimeout(resizeTimeout);
          canvas.width = canvas.getBoundingClientRect().width;
          canvas.height = canvas.getBoundingClientRect().height;
          offsetLeft = canvas.getBoundingClientRect().left;
          offsetTop = canvas.getBoundingClientRect().top;
          resizeTimeout = setTimeout(resizeCanvas,100);
        });

        const pushClick = (click) => {
          this.tempClicks.push(click);
          socket.emit('draw',click);
          this.draw(click);
        };

        $(canvas).mousedown(function (e) {
          if (!plugin.drawing)
            return;

          offsetLeft = canvas.getBoundingClientRect().left;
          offsetTop = canvas.getBoundingClientRect().top;
          let height = canvas.getBoundingClientRect().height, width = canvas.getBoundingClientRect().width;
          const mouseX = (e.pageX - offsetLeft) / width;
          const mouseY = (e.pageY - offsetTop) / height;
          // console.log("MD X:" + mouseX + " Y:" + mouseY)
          paint = true;
          if (shapes.includes(plugin.drawingTool)) {
            plugin.startX = mouseX;
            plugin.startY = mouseY;
            pushClick({
              status: 'start', x: mouseX, y: mouseY,
              tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
              fill: plugin.isFilled,
            });
          } else if (plugin.drawingTool == 'fill') {
            let click = {
              x: mouseX, y: mouseY, drag: false,
              tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
            };
            pushClick(click);
            plugin.fillCanvas(click);
          } else {
            pushClick({
              x: mouseX, y: mouseY, drag: false,
              tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
            });
          }
        }).mousemove(function (e) {
          if (!plugin.drawing)
            return;
          offsetLeft = canvas.getBoundingClientRect().left;
          offsetTop = canvas.getBoundingClientRect().top;
          let height = canvas.getBoundingClientRect().height, width = canvas.getBoundingClientRect().width;
          const mouseX = (e.pageX - offsetLeft) / width;
          const mouseY = (e.pageY - offsetTop) / height;
          if (paint) {
            // console.log("MM X:" + mouseX + " Y:" + mouseY)
            if (shapes.includes(plugin.drawingTool)) {
              pushClick({
                status: 'draw', startX: plugin.startX, startY: plugin.startY, x: mouseX, y: mouseY,
                tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
                fill: plugin.isFilled,
              });
            } else {
              pushClick({
                x: mouseX, y: mouseY, drag: true,
                tool: plugin.drawingTool, color: plugin.color, width: plugin.width,
              });
            }
          } else {
            //TODO: Implement cursors
            context.lineJoin = 'round';
            context.fillStyle = plugin.color;
            context.lineWidth = plugin.width;
            context.strokeStyle = plugin.color;
            context.putImageData(plugin.imageData,0,0);
            let width = canvas.width, height = canvas.height;
            switch (plugin.drawingTool) {
              case 'eraser':
                context.lineWidth = plugin.width+1;
                context.strokeStyle = "#000000";
                context.beginPath();
                context.moveTo(mouseX*width, mouseY*height);
                context.lineTo(mouseX*width+1,mouseY*height);
                context.closePath();
                context.stroke();
                context.lineWidth = plugin.width;
                context.strokeStyle = "#FFFFFF";
                context.beginPath();
                context.moveTo(mouseX*width, mouseY*height);
                context.lineTo(mouseX*width+1,mouseY*height);
                context.closePath();
                context.stroke();
                break;
              default:
                context.lineWidth = plugin.width+1;
                context.strokeStyle = invertColor(plugin.color);
                context.beginPath();
                context.moveTo(mouseX*width, mouseY*height);
                context.lineTo(mouseX*width+1,mouseY*height);
                context.closePath();
                context.stroke();
                context.lineWidth = plugin.width;
                context.strokeStyle = plugin.color;
                context.beginPath();
                context.moveTo(mouseX*width, mouseY*height);
                context.lineTo(mouseX*width+1,mouseY*height);
                context.closePath();
                context.stroke();
                break;
            }
          }
        }).mouseleave(function (e) {
          // console.log("ML")
          context.putImageData(plugin.imageData,0,0);
          if (paint && shapes.includes(plugin.drawingTool)) {
            let height = canvas.getBoundingClientRect().height, width = canvas.getBoundingClientRect().width;
            const mouseX = (e.pageX - offsetLeft) / width;
            const mouseY = (e.pageY - offsetTop) / height;
            pushClick({
              status: 'cancel',
              tool: plugin.drawingTool,
            });
          }
          paint = false;
        }).mouseup(function (e) {
          // console.log("MU")
          if (paint && shapes.includes(plugin.drawingTool)) {
            let height = canvas.getBoundingClientRect().height, width = canvas.getBoundingClientRect().width;
            const mouseX = (e.pageX - offsetLeft) / width;
            const mouseY = (e.pageY - offsetTop) / height;
            pushClick({
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
          if (!data) {
            this.tempClicks = [];
            return;
          }
          if (this.tempClicks.length > 0) {
            let temp = this.tempClicks.shift();
          } else {
            if (data.tool == 'fill') {
              this.fillCanvas(data);
            }
            plugin.draw(data);
          }
          plugin.addClick(data);
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
      let colorPicker = $("#colorPicker").css('background-color',plugin.color);
      colorPicker.spectrum({
        showPaletteOnly: true,
        hideAfterPaletteSelect: true,
        togglePaletteOnly: true,
        togglePaletteMoreText: 'more',
        togglePaletteLessText: 'less',
        color: 'black',
        palette: [
          ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
          ["#f00","#f90","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
          ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
          ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
          ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
          ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
          ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
          ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
        ],
        change: (color) => {
          colorPicker.css('background-color',color.toHexString());
          plugin.setColor(color.toHexString());
        }
      });
      $(document).
      // on('click','.colorPicker', function() {
      //   plugin.setColor($(this).css('background-color'));
      //   $(this).parent().find('.active').removeClass('active');
      //   $(this).addClass('active');
      // }).
      on('click','.toolPicker', function() {
        let tool = $(this).attr("id").substr("tool_".length);
        plugin.setTool(tool);
        $(this).parent().find('.active.toolPicker').removeClass('active');
        $(this).addClass('active');
      }).
      on('input','#sizePicker', function() {
        $('#sizeLabel').text("Width: "+this.value);
        plugin.setSize(parseInt(this.value));
      });
      // $('#drawingTools').append(toolPicker).append(sizePicker);
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
      let canvas = this.element, context = canvas.getContext('2d'), splice = false;
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
      context.fillStyle = 'white';
      context.fillRect(0,0,context.canvas.width,context.canvas.height);
      context.lineJoin = "round";
      let width = canvas.getBoundingClientRect().width;
      let height = canvas.getBoundingClientRect().height;
      for (let i = 0; i < this.clicks.length; i++) {
        let click = this.clicks[i], x = click.x * width, y = click.y * height;
        if (click.status != 'end' && click.status != null)
          continue;
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
            this.fillCanvas(click);
            break;
          case 'line':
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(x, y);
            context.closePath();
            context.stroke();
            break;
          case 'rectangle':
            if (click.fill)
              context.fillRect(Math.min(startX,x),Math.min(startY,y),
                Math.abs(startX - x),Math.abs(startY - y));
            else
              context.strokeRect(Math.min(startX,x),Math.min(startY,y),
                Math.abs(startX - x),Math.abs(startY - y));
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
      }
      for (let i = 0; i < this.tempClicks.length; i++) {
          let click = this.tempClicks[i], x = click.x * width, y = click.y * height;
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
              //context.putImageData(this.imageData,0,0);
              break;
            case 'line':
              context.beginPath();
              context.moveTo(startX, startY);
              context.lineTo(x, y);
              context.closePath();
              context.stroke();
              break;
            case 'rectangle':
              if (click.fill)
                context.fillRect(Math.min(startX,x),Math.min(startY,y),
                  Math.abs(startX - x),Math.abs(startY - y));
              else
                context.strokeRect(Math.min(startX,x),Math.min(startY,y),
                  Math.abs(startX - x),Math.abs(startY - y));
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
      }
      this.imageData = context.getImageData(0,0,width,height);
    },

    /**
     *
     */
    draw: function (click) {
      let canvas = this.element, context = canvas.getContext('2d');
      let width = canvas.getBoundingClientRect().width;
      let height = canvas.getBoundingClientRect().height;
      let x = click.x * width, y = click.y * height;
      let startX = click.startX * width, startY = click.startY * height;
      //clearTimeout(this.imageDataTimer);
      // console.log(click);
      if (!click.status || click.status != 'end') {
        context.putImageData(this.imageData,0,0);
      }
      context.lineJoin = "round";
      context.lineWidth = click.width;
      context.strokeStyle = click.color;
      context.fillStyle = click.color;
      switch (click.tool) {
        case 'eraser':
          context.strokeStyle = 'white';
        case 'pencil':
          context.beginPath();
          if (click.drag)
            context.moveTo(this.prevClick.x*width,this.prevClick.y*height);
          else
            context.moveTo(x - 1, y);
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
      //this.imageDataTimer = setTimeout(()=>{
      if (click.status == 'end' || click.status == null) {
        this.prevClick = click;
        this.imageData = context.getImageData(0,0,context.canvas.width,context.canvas.height);
      }
      //},25);
    },
    /*
     * Clears the board locally
     */
    clear: function() {
      this.clicks = [];
      this.tempClicks = [];
      let context = this.element.getContext('2d');
      context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
      context.fillStyle = 'white';
      context.fillRect(0,0,context.canvas.width,context.canvas.height);
      this.imageData = context.getImageData(0,0,context.canvas.width,context.canvas.height);
    },

    /*
     * Load a drawing to whiteboard
     */
    load: function (clicks) {
      this.clicks = clicks;
      this.tempClicks = [];
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
      if (!draw)
        $(this.element).css('cursor','auto');
      else
        $(this.element).css('cursor','none');
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