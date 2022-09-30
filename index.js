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