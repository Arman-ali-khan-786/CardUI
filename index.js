// add you code here

// darkModeBtn
const darkModeBtn = document.querySelector('.dark-mode-btn');
const header = document.querySelector('header');
const headerTag = document.querySelectorAll('.header-tag');
const body = document.querySelector('body');
const effectCode = document.querySelectorAll('.effect-code');
const em = document.querySelectorAll('em');
const wantToContribute = document.querySelector('.want-to-contribute');
darkModeBtn.addEventListener('click', () => {
    darkModeBtn.classList.toggle('active');

    //changing the theme color
    header.classList.toggle('active');
    headerTag.forEach((e)=>{
        e.classList.toggle('active');
    });
    body.classList.toggle('active');
    effectCode.forEach((e)=>{
        e.children[0].classList.toggle('active');
    });
    em.forEach((e)=>{
        e.classList.toggle('active');
    });
    wantToContribute.classList.toggle('active'); 
});

// ---------------------------------- Ui-3 Js code -------------------------------------
// ---------------------------------- Ui-4 Js code -------------------------------------

// ---------------------------------- Ui-7 Js code starts here -------------------------------------
        
            const img = document.querySelector("img");
            const icon = document.querySelector(".icons");
            img.onclick = function(){
              this.classList.toggle("active");
              icons.classList.toggle("active");}

// ---------------------------------- Ui-22 Code Begins Here --------------------------------

const showSocial = (toggleCard, socialCard) => {
    const toggle = document.getElementById(toggleCard),
      social = document.getElementById(socialCard);
  
    toggle.addEventListener("click", () => {
      if (social.classList.contains("animation")) {
        social.classList.add("down-animation");
  
        setTimeout(() => {
          social.classList.remove("down-animation");
        }, 1000);
      }
      social.classList.toggle("animation");
    });
  };
  
  showSocial("card-toggle", "card-social");
  