(($) => {

  /**
   * Usernames
   */
  get_username = function () {
  
    // Get username from user and check if it is unique
    var unique = false;
    var username = prompt("Please enter your name:", "anon"+Math.trunc(Math.random()*10000));
    socket.emit('nameMessage', username);
    
    // Loop until username is unique
    while (!unique) {
    
      socket.on('nameMessage', ('unique') => {
          unique = true;
        }).on('nameMessage', ('notUnique') => {
          var username = prompt("That name is taken! Please enter your name:", "anon"+Math.trunc(Math.random()*10000));
          socket.emit('nameMessage', username);
        });
        
    }

  };

})(jQuery);
