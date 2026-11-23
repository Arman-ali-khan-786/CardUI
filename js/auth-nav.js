import {
  auth,
  persistenceReady,
  onAuthStateChanged,
  signOut,
  isSafeHttpUrl,
} from "./firebase-client.js";
import { getInitials } from "./effects-data.js";

const THEME_KEY = "cu-theme";
const LEGACY_DARK_KEY = "cardui_dark_mode";

const SUN_SVG = `<svg class="cu-theme-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const MOON_SVG = `<svg class="cu-theme-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

export function isDarkThemeActive() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function applyThemeState(isDark) {
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  if (document.body) {
    document.body.classList.toggle("active", isDark);
  }
  document.querySelectorAll("em").forEach((el) => {
    el.classList.toggle("active", isDark);
  });

  const themeBtn = document.getElementById("cu-theme");
  if (themeBtn) {
    themeBtn.setAttribute("aria-pressed", String(isDark));
    themeBtn.title = isDark ? "Switch to Studio Light mode" : "Switch to Obsidian Dark mode";
    themeBtn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
  }

  const drawerThemeBtn = document.getElementById("cu-drawer-theme");
  if (drawerThemeBtn) {
    drawerThemeBtn.setAttribute("aria-pressed", String(isDark));
    drawerThemeBtn.innerHTML = isDark
      ? `${SUN_SVG} <span>Light</span>`
      : `${MOON_SVG} <span>Dark</span>`;
  }
}

function triggerThemeTransition(nextDark, triggerEl) {
  try {
    localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
    localStorage.setItem(LEGACY_DARK_KEY, String(nextDark));
  } catch {
    // Ignore storage failures in restricted contexts
  }

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let originX = window.innerWidth - 48;
  let originY = 32;
  if (triggerEl && typeof triggerEl.getBoundingClientRect === "function") {
    const rect = triggerEl.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
  }

  const endRadius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY)
  );

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--theme-x", `${Math.round(originX)}px`);
  rootStyle.setProperty("--theme-y", `${Math.round(originY)}px`);
  rootStyle.setProperty("--theme-r", `${Math.ceil(endRadius)}px`);

  if (!prefersReduced && typeof document.startViewTransition === "function") {
    document.startViewTransition(() => {
      applyThemeState(nextDark);
    });
    return;
  }

  applyThemeState(nextDark);
  if (!prefersReduced && document.body) {
    const pulse = document.createElement("div");
    pulse.className = "cu-theme-pulse";
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 520);
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

  const bindToggle = (btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      triggerThemeTransition(!isDarkThemeActive(), btn);
    });
  };

  bindToggle(document.getElementById("cu-theme"));
  bindToggle(document.getElementById("cu-drawer-theme"));
}

function setAvatarContents(avatarEl, photoURL, displayName) {
  if (!avatarEl) return;
  avatarEl.innerHTML = "";
  const safePhoto = isSafeHttpUrl(photoURL);
  if (safePhoto) {
    const img = document.createElement("img");
    img.src = safePhoto;
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

export function renderHeaderAvatar(user, overrideName = "") {
  const displayName =
    overrideName ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Profile");

  const desktopAvatar = document.getElementById("cu-avatar");
  const desktopName = document.getElementById("cu-prof-name");
  if (desktopName) desktopName.textContent = displayName;
  setAvatarContents(desktopAvatar, user?.photoURL, displayName);

  const drawerAvatar = document.getElementById("cu-drawer-avatar");
  const drawerName = document.getElementById("cu-drawer-prof-name");
  if (drawerName) drawerName.textContent = displayName;
  setAvatarContents(drawerAvatar, user?.photoURL, displayName);
}

function updateHeaderAuthState(user) {
  const guestGroup = document.getElementById("cu-auth-guest");
  const userGroup = document.getElementById("cu-auth-user");
  const profLink = document.getElementById("cu-prof");

  if (guestGroup) guestGroup.hidden = Boolean(user);
  if (userGroup) userGroup.hidden = !user;

  const drawerGuest = document.getElementById("cu-drawer-guest");
  const drawerUser = document.getElementById("cu-drawer-user");
  if (drawerGuest) drawerGuest.hidden = Boolean(user);
  if (drawerUser) drawerUser.hidden = !user;

  if (user) {
    renderHeaderAvatar(user);
  }

  if (profLink) {
    const isProfilePage = window.location.pathname.endsWith("profile.html");
    const params = new URLSearchParams(window.location.search);
    const viewingPeer = Boolean(params.get("uid") && params.get("uid") !== user?.uid) || Boolean(params.get("author"));
    profLink.classList.toggle("on", Boolean(user && isProfilePage && !viewingPeer));
  }
}

export function closeMobileDrawer() {
  const drawer = document.getElementById("cu-drawer");
  const backdrop = document.getElementById("cu-drawer-backdrop");
  const menuBtn = document.getElementById("cu-menu-btn");
  if (drawer) drawer.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
  if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function openMobileDrawer() {
  const drawer = document.getElementById("cu-drawer");
  const backdrop = document.getElementById("cu-drawer-backdrop");
  const menuBtn = document.getElementById("cu-menu-btn");
  if (!drawer) return;
  drawer.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
  if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function initMobileDrawer() {
  const menuBtn = document.getElementById("cu-menu-btn");
  const closeBtn = document.getElementById("cu-drawer-close");
  const backdrop = document.getElementById("cu-drawer-backdrop");
  const drawer = document.getElementById("cu-drawer");

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      if (drawer?.classList.contains("open")) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeMobileDrawer);
  if (backdrop) backdrop.addEventListener("click", closeMobileDrawer);

  if (drawer) {
    drawer.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        closeMobileDrawer();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileDrawer();
    }
  });
}

async function performSignOut(btn) {
  if (btn) {
    btn.disabled = true;
    btn.dataset.origText = btn.textContent;
    btn.textContent = "Signing out...";
  }
  try {
    closeMobileDrawer();
    await signOut(auth);
    if (window.location.pathname.endsWith("profile.html")) {
      window.location.href = "./index.html#home";
    }
  } catch (err) {
    console.error("Sign out failed:", err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.origText || "Sign out";
    }
  }
}

export function initAuthNav(onUserResolved) {
  initThemeToggle();
  initMobileDrawer();

  const signoutBtn = document.getElementById("cu-signout");
  const drawerSignoutBtn = document.getElementById("cu-drawer-signout");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", () => performSignOut(signoutBtn));
  }
  if (drawerSignoutBtn) {
    drawerSignoutBtn.addEventListener("click", () => performSignOut(drawerSignoutBtn));
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
