import {
  auth,
  persistenceReady,
  onAuthStateChanged,
  signOut,
} from "./firebase-client.js";
import { getInitials } from "./effects-data.js";

const THEME_KEY = "cu-theme";
const LEGACY_DARK_KEY = "cardui_dark_mode";

export function isDarkThemeActive() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function applyThemeState(isDark) {
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  if (document.body) {
    document.body.classList.toggle("active", isDark);
  }
  document.querySelectorAll("em, .effect-code > a").forEach((el) => {
    el.classList.toggle("active", isDark);
  });
  const themeBtn = document.getElementById("cu-theme");
  if (themeBtn) {
    themeBtn.setAttribute("aria-pressed", String(isDark));
    themeBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    themeBtn.textContent = isDark ? "☀" : "◐";
  }
}

export function initThemeToggle() {
  let savedDark = false;
  try {
    const cuTheme = localStorage.getItem(THEME_KEY);
    if (cuTheme === "dark" || cuTheme === "light") {
      savedDark = cuTheme === "dark";
    } else if (localStorage.getItem(LEGACY_DARK_KEY) !== null) {
      savedDark = localStorage.getItem(LEGACY_DARK_KEY) === "true";
    } else if (window.matchMedia) {
      savedDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  } catch {
    savedDark = false;
  }

  applyThemeState(savedDark);

  const themeBtn = document.getElementById("cu-theme");
  if (!themeBtn) return;

  themeBtn.addEventListener("click", () => {
    const nextDark = !isDarkThemeActive();
    try {
      localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
      localStorage.setItem(LEGACY_DARK_KEY, String(nextDark));
    } catch {
      // Ignore storage failures in restricted contexts
    }
    applyThemeState(nextDark);
  });
}

export function renderHeaderAvatar(user, overrideName = "") {
  const avatarEl = document.getElementById("cu-avatar");
  const nameEl = document.getElementById("cu-prof-name");
  if (!avatarEl || !nameEl) return;

  const displayName =
    overrideName ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Profile");
  nameEl.textContent = displayName;

  avatarEl.innerHTML = "";
  if (user?.photoURL) {
    const img = document.createElement("img");
    img.src = user.photoURL;
    img.alt = `${displayName} avatar`;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      avatarEl.textContent = getInitials(displayName);
    };
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = getInitials(displayName);
  }
}

function updateHeaderAuthState(user) {
  const guestGroup = document.getElementById("cu-auth-guest");
  const userGroup = document.getElementById("cu-auth-user");
  const profLink = document.getElementById("cu-prof");

  if (guestGroup) guestGroup.hidden = Boolean(user);
  if (userGroup) userGroup.hidden = !user;

  if (user) {
    renderHeaderAvatar(user);
  }

  if (profLink) {
    const isProfilePage = window.location.pathname.endsWith("profile.html");
    profLink.classList.toggle("on", Boolean(user && isProfilePage));
  }
}

export function initAuthNav(onUserResolved) {
  initThemeToggle();

  const signoutBtn = document.getElementById("cu-signout");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      signoutBtn.disabled = true;
      const original = signoutBtn.textContent;
      signoutBtn.textContent = "Signing out...";
      try {
        await signOut(auth);
        if (window.location.pathname.endsWith("profile.html")) {
          window.location.href = "./index.html#home";
        }
      } catch (err) {
        console.error("Sign out failed:", err);
      } finally {
        signoutBtn.disabled = false;
        signoutBtn.textContent = original;
      }
    });
  }

  persistenceReady.then(() => {
    onAuthStateChanged(auth, (user) => {
      updateHeaderAuthState(user);
      if (typeof onUserResolved === "function") {
        onUserResolved(user);
      }
    });
  });
}
