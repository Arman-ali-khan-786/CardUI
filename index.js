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
            const icons = document.querySelector(".icons");
            img.onclick = function(){
              this.classList.toggle("active");
              icons.classList.toggle("active");}

// ---------------------------------- Ui-7 Js code ends here -------------------------------------


// ---------------------------------- Ui-8 js code starts here -----------------------------------

function time() {
    let hour = new Date().getHours();
    if (hour >= 24 || hour<=12) return 'AM';
    if (hour >= 12 || hour<=24) return 'PM';
}


const d = new Date();
let hour = d.getHours();
let minutes = d.getMinutes();
document.getElementById("clock").innerHTML = (hour + ":" + minutes + " " + time());

function greeting() {
    let hour = new Date().getHours();
    if (hour >= 4 && hour <= 11) return 'morning';
    if (hour >= 12 && hour <= 16) return 'afternoon';
    if (hour >= 17 && hour <= 23) return 'evening';
    if (hour >= 24 || hour <= 3) return 'night';
}
document.getElementById("wishings").innerHTML = ('Good ' + greeting());