
const intro = document.getElementById("intro");
const letterScreen = document.getElementById("letterScreen");
const envelope = document.getElementById("envelope");

const openBtn = document.getElementById("openBtn");
const backBtn = document.getElementById("backBtn");

const passwordOverlay = document.getElementById("passwordOverlay");
const passwordBox = document.getElementById("passwordBox");
const passwordForm = document.getElementById("passwordForm");
const passwordInput = document.getElementById("passwordInput");
const errorMessage = document.getElementById("errorMessage");
const cancelBtn = document.getElementById("cancelBtn");

const correctPassword = "KuRts";

let isOpening = false;


// OPEN PASSWORD MODAL

openBtn.addEventListener("click", function() {

    passwordOverlay.classList.add("active");

    setTimeout(() => {
        passwordInput.focus();
    }, 500);

});


// CLOSE PASSWORD MODAL

cancelBtn.addEventListener("click", function() {

    passwordOverlay.classList.remove("active");

    passwordInput.value = "";
    errorMessage.classList.remove("show");

});


// CHECK PASSWORD

passwordForm.addEventListener("submit", function(event) {

    event.preventDefault();

    if (isOpening) return;

    const enteredPassword = passwordInput.value;

    if (enteredPassword === correctPassword) {

        isOpening = true;

        errorMessage.classList.remove("show");

        // Close password modal
        passwordOverlay.classList.remove("active");

        // Start envelope animation
        setTimeout(() => {

            intro.classList.add("unlocking");
            envelope.classList.add("open");

        }, 400);

        // Transition to letter
        setTimeout(() => {

            intro.classList.add("hide");

            setTimeout(() => {

                intro.style.display = "none";

                letterScreen.classList.add("show");

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }, 800);

        }, 1800);

    } else {

        // Incorrect password
        errorMessage.classList.remove("show");

        // Restart animation
        void passwordBox.offsetWidth;

        errorMessage.classList.add("show");
        passwordBox.classList.add("shake");

        passwordInput.value = "";
        passwordInput.focus();

        setTimeout(() => {
            passwordBox.classList.remove("shake");
        }, 400);

    }

});


// READ AGAIN

backBtn.addEventListener("click", function() {

    letterScreen.classList.remove("show");

    setTimeout(() => {

        intro.style.display = "flex";

        intro.classList.remove("hide");
        intro.classList.remove("unlocking");

        envelope.classList.remove("open");

        passwordInput.value = "";
        errorMessage.classList.remove("show");

        isOpening = false;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }, 400);

});


// FLOATING DUST PARTICLES

function createDust() {

    const dust = document.createElement("div");

    dust.className = "dust";

    dust.style.left = Math.random() * 100 + "vw";

    dust.style.animationDuration =
        (5 + Math.random() * 6) + "s";

    dust.style.opacity =
        Math.random() * 0.5;

    const size = 1 + Math.random() * 3;

    dust.style.width = size + "px";
    dust.style.height = size + "px";

    document.getElementById("dustContainer").appendChild(dust);

    setTimeout(() => {
        dust.remove();
    }, 11000);

}

// Create dust continuously
setInterval(createDust, 400);

