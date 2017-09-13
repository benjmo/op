const express = require('express');
const app     = express();
const path    = require('path');
const http    = require('http').Server(app);
const io      = require('socket.io')(http);
const game    = require('./game')(io);

app.use(express.static('static'));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

/* Routes all go here */
app.get('/', function(req, res){
    res.render('index');
});
app.get('/draw/', function(req, res){
    res.render('index',{drawing: true});
});

/* top level socket.io stuff goes here */
io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('draw', game.draw);
});

const port = process.env.PORT || 3000;
http.listen(port, function(){
    console.log('listening on *:'+port);
});