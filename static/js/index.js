(($) => {
  $(document).ready(() => {
    $('#start').click(() => {
      // const backend = window.location.hostname;
      console.log('ye');
      fetch('room/name').then((res) => {
        return res.text();
      }).then((roomName) => {
        console.log('ye12');
        window.location = 'play.html?game=' + roomName;
      });
    });
  });
})(jQuery);