// CardUI interactive card scripts (dark mode & auth nav handled by ./js/auth-nav.js)

// ---------------------------------- Ui-7 Js code starts here -------------------------------------
const card7Img = document.querySelector(".card7 .wrappers img") || document.querySelector("img");
const card7Icons = document.querySelector(".card7 .icons") || document.querySelector(".icons");
if (card7Img && card7Icons) {
    card7Img.onclick = function () {
        this.classList.toggle("active");
        card7Icons.classList.toggle("active");
    };
}

