import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  syncUserProfile,
  mapAuthError,
  mapFirestoreUserError,
} from "./firebase-client.js";
import { initAuthNav } from "./auth-nav.js";

const loginForm = document.getElementById("login-form");
const googleBtn = document.getElementById("google-login-btn");
const forgotBtn = document.getElementById("forgot-password-btn");
const feedbackEl = document.getElementById("auth-feedback");
const submitBtn = document.getElementById("login-submit-btn");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const togglePwBtn = document.getElementById("toggle-login-password");

let authActionInProgress = false;

function getSafeRedirect() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("redirect") || "";
  if (raw === "profile.html" || raw === "index.html") {
    return `./${raw}`;
  }
  return "./profile.html";
}

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
  forgotBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Signing in..." : "Sign In";
}

initAuthNav((user) => {
  if (user && !authActionInProgress) {
    window.location.replace(getSafeRedirect());
  }
});

if (togglePwBtn && passwordInput) {
  togglePwBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePwBtn.textContent = isHidden ? "Hide" : "Show";
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFeedback();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showFeedback("Please enter both your email and password.");
    return;
  }

  setLoading(true);
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    try {
      await syncUserProfile(credential.user);
    } catch (fsErr) {
      console.warn("Firestore sync deferred:", mapFirestoreUserError(fsErr));
    }
    window.location.href = getSafeRedirect();
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
    window.location.href = getSafeRedirect();
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
    setLoading(false);
  }
});

forgotBtn.addEventListener("click", async () => {
  clearFeedback();
  const email = emailInput.value.trim();
  if (!email) {
    showFeedback("Enter your email address above first, then click Forgot Password.");
    emailInput.focus();
    return;
  }

  forgotBtn.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    showFeedback(`Password reset link sent to ${email}. Check your inbox.`, "success");
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
  } finally {
    forgotBtn.disabled = false;
  }
});
