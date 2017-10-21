/*|-------------blinkTitle.js----------------------------------------------------|
  |-------(Pure Javascript TitleBar Alert Script)----------------------------------|
  |-----------Author : flouthoc (gunnerar7@gmail.com)(http://github.com/flouthoc)|
  */
//To Do's
// 1) Add Timeout Per Notification
// 2) Simplify To JSON Arguments   

var hold = "";
function blinkTitle(msg1, msg2, delay, isFocus, timeout) {
  if (isFocus == null) {
    isFocus = false;
  }

  if (timeout == null) {
    timeout = false;
  }

  if(timeout){
    setTimeout(blinkTitleStop, timeout);
  }

  document.title = msg1;

  if (isFocus == false) {
    hold = window.setInterval(function() {
      if (document.title == msg1) {
        document.title = msg2;
      } else {
        document.title = msg1;
      }
    }, delay);
  }

  if (isFocus == true) {
    let onPage = false;
    let testflag = true;
    let initialTitle = document.title;
    window.onfocus = function() {
      onPage = true;
      document.title = initialTitle;
      clearInterval(hold);
    };

    window.onblur = function() {
      onPage = false;
      testflag = false;
    };

    hold = window.setInterval(function() {
      if (onPage == false) {
        if (document.title == msg1) {
          document.title = msg2;
        } else {
          document.title = msg1;
        }
      }
    }, delay);
  }
}

function blinkTitleStop() {
  clearInterval(hold); 
}