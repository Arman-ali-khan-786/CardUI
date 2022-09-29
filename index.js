// add you code here
function toggledarklight(){
    var element=document.body;
    var mode=document.getElementById("mode");
      if(element.className=="light-mode"){
          element.className="dark-mode";
        mode.innerText="Light";
      }
      else{
      element.className="light-mode";
      mode.innerText="Dark";
      }
    }
    
    // ---------------------------------- Ui-3 Js code -------------------------------------
    // ---------------------------------- Ui-4 Js code -------------------------------------