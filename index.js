// add you code here
function toggledarklight(){
    var element=document.body;
    var mode=document.getElementById("mode"); // selecting button element by id
      if(element.className=="light-mode"){ // if element has class light-mode 
          element.className="dark-mode"; //then change class to dark mode
        mode.innerText="Light"; // and change text to Light
      }
      else{ // if element has class dark-mode
      element.className="light-mode"; //then change class to dark mode 
      mode.innerText="Dark";  // and change text to Dark 
      }
    }
    
    // ---------------------------------- Ui-3 Js code -------------------------------------
    // ---------------------------------- Ui-4 Js code -------------------------------------