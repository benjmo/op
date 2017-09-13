function initialise(drawingCanvas, draw) {
    var context = drawingCanvas[0].getContext('2d');
    if (context) {
        var socket = io();
        var clickX = [];
        var clickY = [];
        var clickDrag = [];
        var paint;

        var addClick = function (x, y, dragging) {
            clickX.push(x);
            clickY.push(y);
            clickDrag.push(dragging);
        }

        function redraw() {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

            context.strokeStyle = "#df4b26";
            context.lineJoin = "round";
            context.lineWidth = 5;

            for (var i = 0; i < clickX.length; i++) {
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

        if (draw) {
            drawingCanvas.mousedown(function (e) {
                var mouseX = e.pageX - this.offsetLeft;
                var mouseY = e.pageY - this.offsetTop;
                console.log("MD X:" + mouseX + " Y:" + mouseY)
                paint = true;
                addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
                redraw();
                socket.emit('draw', {
                    x: mouseX,
                    y: mouseY,
                    drag: false
                });
            }).mousemove(function (e) {
                if (paint) {
                    var mouseX = e.pageX - this.offsetLeft;
                    var mouseY = e.pageY - this.offsetTop;
                    console.log("MM X:" + mouseX + " Y:" + mouseY)
                    addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
                    redraw();
                    socket.emit('draw', {
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
        } else {
            socket.on('draw', function(data){
                addClick(data.x,data.y,data.drag);
                redraw();
            });
        }
    }
}