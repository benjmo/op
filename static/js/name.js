/**
 * Usernames
 */
get_username = function (socket) {
  // Get username from user and check if it is unique
  let unique = false;
  let username = prompt("Please enter your name:", "anon"+Math.trunc(Math.random()*10000));
  socket.emit('nameMessage', username);

  socket.on('nameMessage', (unique) => {
    if (unique)
      unique = true;
    else {
      username = prompt("That name is taken! Please enter your name:", "anon"+Math.trunc(Math.random()*10000));
      socket.emit('nameMessage', username);
    }
  });
  // Loop until username is unique
  // while (!unique) {
  // }

};
