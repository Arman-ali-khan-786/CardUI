import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  syncUserProfile,
  mapAuthError,
  mapFirestoreUserError,
} from "./firebase-client.js";
import { FIELD_LIMITS } from "./firebase-config.js";
import { initAuthNav } from "./auth-nav.js";

const signupForm = document.getElementById("signup-form");
const googleBtn = document.getElementById("google-signup-btn");
const feedbackEl = document.getElementById("auth-feedback");
const submitBtn = document.getElementById("signup-submit-btn");
const nameInput = document.getElementById("signup-name");
const emailInput = document.getElementById("signup-email");
const passwordInput = document.getElementById("signup-password");
const confirmInput = document.getElementById("signup-confirm-password");
const togglePwBtn = document.getElementById("toggle-signup-password");

let authActionInProgress = false;

function showFeedback(message, type = "error") {
  feedbackEl.textContent = message;
  feedbackEl.className = `auth-feedback ${type}`;
  feedbackEl.hidden = false;
}

function clearFeedback() {
  feedbackEl.hidden = true;
  feedbackEl.textContent = "";
}

function setLoading(isLoading) {
  authActionInProgress = isLoading;
  submitBtn.disabled = isLoading;
  googleBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Creating account..." : "Create Account";
}

initAuthNav((user) => {
  if (user && !authActionInProgress) {
    window.location.replace("./profile.html");
  }
});

if (togglePwBtn && passwordInput) {
  togglePwBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePwBtn.textContent = isHidden ? "Hide" : "Show";
  });
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFeedback();

  const displayName = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  if (!displayName || displayName.length > FIELD_LIMITS.DISPLAY_NAME_MAX) {
    showFeedback(`Display name must be between 1 and ${FIELD_LIMITS.DISPLAY_NAME_MAX} characters.`);
    return;
  }
  if (!email || email.length > FIELD_LIMITS.EMAIL_MAX) {
    showFeedback("Please enter a valid email address.");
    return;
  }
  if (password.length < 6) {
    showFeedback("Password must be at least 6 characters long.");
    return;
  }
  if (password !== confirmPassword) {
    showFeedback("Passwords do not match.");
    return;
  }

  setLoading(true);
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    sendEmailVerification(credential.user).catch((err) =>
      console.warn("Verification email notice:", err)
    );

    try {
      await syncUserProfile(credential.user, displayName);
    } catch (fsErr) {
      console.warn("Firestore sync deferred:", mapFirestoreUserError(fsErr));
    }

    window.location.href = "./profile.html";
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
    setLoading(false);
  }
});

googleBtn.addEventListener("click", async () => {
  clearFeedback();
  setLoading(true);
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    try {
      await syncUserProfile(credential.user);
    } catch (fsErr) {
      console.warn("Firestore sync deferred:", mapFirestoreUserError(fsErr));
    }
    window.location.href = "./profile.html";
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
    setLoading(false);
  }
});
