const express = require('express');
const session = require("express-session")({
  secret: "helloworld",
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false,
  },
});
const sharedsession = require("express-socket.io-session");
const app = express();
const path = require('path');
const http = require('http').Server(app);
const ut = require('util');

const io = require('socket.io')(http);
const game = require('./game')(io);

app.use(session);
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

io.use(sharedsession(session, {
  autoSave:true
}));

/* top level socket.io stuff goes here */
io.on('connection', function (socket) {
  console.log('a user connected');
  console.log('SID:' +socket.handshake.sessionID);
  let session = socket.handshake.session;
  let client = game.createClient(socket, session, socket.handshake.sessionID);
  socket.emit('clientInfo',{room:session.room,
    name:session.name,id:client.getID(),status:session.inGame});
  //return if session is already in a game
  if (session.inGame)
    return;
  if (session.name)
    client.setName(session.name);
  if (session.room)
    client.reconnect(game.getRoom(session.room));
  socket.on('nameMessage',(data) =>
    socket.emit('nameMessage',client.nameMessage(data)));
  socket.on('joinRoom', (data) =>
    client.joinRoom(game.getRoom(data)));
  socket.on('draw', (data) => client.draw(data));
  socket.on('chatMessage', (data) => client.chatMessage(data));
  socket.on('skipDrawing', () => client.skipDrawing());
  socket.on('clear', () => client.clearDrawing());
  socket.on('disconnect', () => client.disconnect());
  socket.on('hint', () => client.giveHint());
});

const port = process.env.PORT || 3000;
http.listen(port, '0.0.0.0', function () {
  console.log('listening on *:' + port);
});
