(($) => {
  $(document).ready(() => {
    fetch('room/settings').then((res) => {
      return res.json();
    }).then((body) => {
      $('#name').val(body.name.default);
      let themeInput = $('#wordTheme');
      themeInput.empty();
      for (const theme of body.wordTheme.values) {
        themeInput.append('<option>' + theme + '</option>');
      }
      themeInput.val(body.wordTheme.default);
    });

    $('#quickStart').click(() => {
      fetch('room/name').then((res) => {
        return res.text();
      }).then((roomName) => {
        window.location = 'play.html?game=' + roomName;
      });
    });

    $('#settingsForm').submit(function(event) {
      event.preventDefault();
      const body = {
        name: $('#name').val(),
        settings: {
          wordTheme: $('#wordTheme').val()
        }
      };
      console.log(body);
      fetch('room/create', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'post',
        body: JSON.stringify(body)
      }).then((res) => {
        if (res.ok) {
          window.location = 'play.html?game=' + body.name
        } else {
          alert('Error creating game, maybe try a new name?');
        }
      });
    });
  });
})(jQuery);