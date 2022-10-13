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

              // ---------------------------------- Ui-12 Js code -------------------------------------

function addClass(){
    document.querySelector(".card12 img").classList.add("new");
    document.querySelector(".card12 img").classList.remove("old");
}
function removeClass(){
    document.querySelector(".card12 img").classList.add("old");
    document.querySelector(".card12 img").classList.remove("new");
}