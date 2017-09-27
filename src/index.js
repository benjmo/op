const express = require('express');
const app = express();
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const game = require('./game')(io);

app.use(express.static('static'));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

/* Routes all go here */
app.get('/', function (req, res) {
  res.render('index');
});
app.get('/play/:id', function (req, res) {
  res.render('index', {game: req.params.id, drawing: true});
});
app.get('/draw/', function (req, res) {
  res.render('index', {drawing: true});
});
app.get('/message/', function (req, res) {
  res.render('messages');
});

/* top level socket.io stuff goes here */
io.on('connection', function (socket) {
  console.log('a user connected');
  let client = game.createClient(socket);
  socket.on('nameMessage',(data) => client.nameMessage(data));
  socket.on('joinRoom', (data) => client.joinRoom(game.getRoom(data)));
  socket.on('draw', (data) => client.draw(data));
  socket.on('chatMessage', (data) => client.chatMessage(data));
  socket.on('skipDrawing', () => client.skipDrawing());
  socket.on('clear', () => client.clearDrawing());
  socket.on('disconnect', () => client.leaveRoom());
});

const port = process.env.PORT || 3000;
http.listen(port, function () {
  console.log('listening on *:' + port);
});