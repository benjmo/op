var app = require('express')();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/', function(req, res){
    res.render('index');
});
app.get('/draw/', function(req, res){
    res.render('index',{drawing: true});
}).get('/drawing.js', function(req,res) {
    res.sendFile(path.join(__dirname, 'drawing.js'));
});
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('draw', function(data) {
        console.log(data);
        io.emit('draw', data);
    })
});

var port = process.env.PORT || 3000;

http.listen(port, function(){
    console.log('listening on *:'+port);
});