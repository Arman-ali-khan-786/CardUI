import {
  auth,
  signOut,
  reload,
  sendEmailVerification,
  syncUserProfile,
  getUserProfile,
  updateUserProfileDoc,
  mapAuthError,
  mapFirestoreUserError,
} from "./firebase-client.js";
import { FIELD_LIMITS } from "./firebase-config.js";
import { initAuthNav, renderHeaderAvatar } from "./auth-nav.js";
import {
  EFFECTS_CATALOG,
  getInitials,
  doesUserMatchAuthor,
  buildContributorsLeaderboard,
} from "./effects-data.js";
import {
  subscribeEffectsLikes,
  subscribeUserLikes,
} from "./likes-service.js";

const loadingEl = document.getElementById("profile-loading");
const contentEl = document.getElementById("profile-content");
const feedbackEl = document.getElementById("profile-feedback");

const avatarWrapEl = document.getElementById("profile-avatar-wrap");
const headerNameEl = document.getElementById("profile-header-name");
const headerEmailEl = document.getElementById("profile-header-email");
const headerBioEl = document.getElementById("profile-header-bio");
const verifiedBadgeEl = document.getElementById("profile-verified-badge");
const verificationActionsEl = document.getElementById("verification-actions");
const resendVerificationBtn = document.getElementById("resend-verification-btn");
const refreshVerificationBtn = document.getElementById("refresh-verification-btn");

const toggleEditBtn = document.getElementById("toggle-edit-btn");
const editPanelEl = document.getElementById("edit-profile-panel");
const editForm = document.getElementById("edit-profile-form");
const editNameInput = document.getElementById("edit-display-name");
const editBioInput = document.getElementById("edit-bio");
const bioCounterEl = document.getElementById("bio-char-count");
const saveProfileBtn = document.getElementById("save-profile-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const logoutBtn = document.getElementById("profile-logout-btn");

const statContributedEl = document.getElementById("stat-contributed");
const statLikesReceivedEl = document.getElementById("stat-likes-received");
const statFavouritesEl = document.getElementById("stat-favourites");
const statRankEl = document.getElementById("stat-rank");

const tabMineBtn = document.getElementById("tab-mine");
const tabFavsBtn = document.getElementById("tab-favs");
const effectsListEl = document.getElementById("profile-effects-list");

let currentUser = null;
let currentProfile = null;
let profileInitialized = false;
let activeTab = "mine";
let effectsLikesMap = {};
let userLikesSet = new Set();
let unsubEffects = null;
let unsubUserLikes = null;

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (ch) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch];
  });
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

function updateBioCounter() {
  bioCounterEl.textContent = `${editBioInput.value.length} / ${FIELD_LIMITS.BIO_MAX}`;
}

function renderAvatar(photoURL, displayName) {
  avatarWrapEl.innerHTML = "";
  if (photoURL) {
    const img = document.createElement("img");
    img.src = photoURL;
    img.alt = `${displayName} profile photo`;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      avatarWrapEl.textContent = getInitials(displayName);
    };
    avatarWrapEl.appendChild(img);
  } else {
    avatarWrapEl.textContent = getInitials(displayName);
  }
}

function renderProfileHeader(user, profile) {
  const displayName = profile?.displayName || user.displayName || "CardUI User";
  const email = profile?.email || user.email || "";
  const photoURL = profile?.photoURL || user.photoURL || "";
  const bio = profile?.bio || "";

  headerNameEl.textContent = displayName;
  headerEmailEl.textContent = email;

  if (bio) {
    headerBioEl.textContent = bio;
    headerBioEl.hidden = false;
  } else {
    headerBioEl.textContent = "";
    headerBioEl.hidden = true;
  }

  renderAvatar(photoURL, displayName);

  if (user.emailVerified) {
    verifiedBadgeEl.textContent = "Email verified";
    verifiedBadgeEl.className = "cu-status-text verified";
    verificationActionsEl.hidden = true;
  } else {
    verifiedBadgeEl.textContent = "Email not verified";
    verifiedBadgeEl.className = "cu-status-text unverified";
    verificationActionsEl.hidden = false;
  }

  editNameInput.value = displayName;
  editBioInput.value = bio;
  updateBioCounter();
}

function renderEffectRow(effect) {
  const count = Number(effectsLikesMap[effect.id] || 0);
  return `
    <div class="cu-row">
      <div class="cu-av">${effect.num}</div>
      <div class="nm">
        <strong>UI-${effect.num} · ${escapeHtml(effect.name)}</strong>
        <small>by ${escapeHtml(effect.author)}</small>
      </div>
      <span class="cu-row-likes">♥ ${count}</span>
      <a href="./index.html?effect=${effect.num}#explore" class="cu-btn cu-ghost">View</a>
    </div>
  `;
}

function renderStatsAndLists() {
  if (!currentUser) return;

  const myEffects = EFFECTS_CATALOG.filter((e) =>
    doesUserMatchAuthor(currentUser, currentProfile, e.author)
  );
  const favEffects = EFFECTS_CATALOG.filter((e) => userLikesSet.has(e.id));

  const likesReceived = myEffects.reduce(
    (sum, e) => sum + Number(effectsLikesMap[e.id] || 0),
    0
  );

  const board = buildContributorsLeaderboard(effectsLikesMap);
  const rankIdx = board.findIndex((entry) =>
    doesUserMatchAuthor(currentUser, currentProfile, entry.author)
  );
  const rankLabel = rankIdx >= 0 ? `#${rankIdx + 1}` : "–";

  statContributedEl.textContent = String(myEffects.length);
  statLikesReceivedEl.textContent = String(likesReceived);
  statFavouritesEl.textContent = String(favEffects.length);
  statRankEl.textContent = rankLabel;

  tabMineBtn.textContent = `My effects (${myEffects.length})`;
  tabFavsBtn.textContent = `Favourites (${favEffects.length})`;

  tabMineBtn.classList.toggle("on", activeTab === "mine");
  tabFavsBtn.classList.toggle("on", activeTab === "favs");
  tabMineBtn.setAttribute("aria-selected", String(activeTab === "mine"));
  tabFavsBtn.setAttribute("aria-selected", String(activeTab === "favs"));

  const list = activeTab === "mine" ? myEffects : favEffects;
  if (list.length > 0) {
    effectsListEl.innerHTML = list.map(renderEffectRow).join("");
  } else if (activeTab === "mine") {
    effectsListEl.innerHTML = `
      <div class="cu-gate" style="padding:36px 20px">
        <p class="cu-sub" style="margin-bottom:14px">No contributed effects matched to "${escapeHtml(
          currentProfile?.displayName || currentUser.displayName || "your name"
        )}" yet.</p>
        <a href="https://github.com/Arman-ali-khan-786/CardUI" target="_blank" rel="noopener noreferrer" class="cu-btn cu-ghost">Contribute on GitHub</a>
      </div>
    `;
  } else {
    effectsListEl.innerHTML = `
      <div class="cu-gate" style="padding:36px 20px">
        <p class="cu-sub" style="margin-bottom:14px">No favourites saved yet. Tap ♥ under any card in Explore.</p>
        <a href="./index.html#explore" class="cu-btn cu-primary">Explore effects →</a>
      </div>
    `;
  }
}

initAuthNav(async (user) => {
  if (!user) {
    window.location.replace("./login.html?redirect=profile.html");
    return;
  }

  currentUser = user;
  if (profileInitialized) return;
  profileInitialized = true;

  unsubEffects = subscribeEffectsLikes(
    (map) => {
      effectsLikesMap = map;
      renderStatsAndLists();
    },
    (err) => {
      console.warn("Effects likes listener notice:", mapFirestoreUserError(err));
    }
  );

  unsubUserLikes = subscribeUserLikes(
    user.uid,
    (likedSet) => {
      userLikesSet = likedSet;
      renderStatsAndLists();
    },
    (err) => {
      console.warn("User likes listener notice:", mapFirestoreUserError(err));
    }
  );

  try {
    let profile = await getUserProfile(user.uid);
    if (!profile) {
      profile = await syncUserProfile(user);
    }
    currentProfile = profile;
    renderProfileHeader(user, profile);
    renderStatsAndLists();
  } catch (err) {
    renderProfileHeader(user, null);
    renderStatsAndLists();
    showFeedback(mapFirestoreUserError(err), "error");
  } finally {
    loadingEl.hidden = true;
    contentEl.hidden = false;
  }
});

tabMineBtn.addEventListener("click", () => {
  activeTab = "mine";
  renderStatsAndLists();
});

tabFavsBtn.addEventListener("click", () => {
  activeTab = "favs";
  renderStatsAndLists();
});

toggleEditBtn.addEventListener("click", () => {
  clearFeedback();
  editPanelEl.hidden = !editPanelEl.hidden;
  if (!editPanelEl.hidden && currentUser) {
    renderProfileHeader(currentUser, currentProfile);
    editNameInput.focus();
  }
});

cancelEditBtn.addEventListener("click", () => {
  clearFeedback();
  editPanelEl.hidden = true;
  if (currentUser) {
    renderProfileHeader(currentUser, currentProfile);
  }
});

editBioInput.addEventListener("input", updateBioCounter);

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  clearFeedback();

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";
  try {
    const updated = await updateUserProfileDoc(currentUser, {
      displayName: editNameInput.value,
      bio: editBioInput.value,
    });
    currentProfile = updated;
    renderProfileHeader(currentUser, updated);
    renderHeaderAvatar(currentUser, updated.displayName);
    renderStatsAndLists();
    editPanelEl.hidden = true;
    showFeedback("Profile updated successfully.", "success");
  } catch (err) {
    showFeedback(mapFirestoreUserError(err), "error");
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save Changes";
  }
});

resendVerificationBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  clearFeedback();
  resendVerificationBtn.disabled = true;
  try {
    await sendEmailVerification(currentUser);
    showFeedback(`Verification email sent to ${currentUser.email}.`, "success");
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
  } finally {
    resendVerificationBtn.disabled = false;
  }
});

refreshVerificationBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  clearFeedback();
  refreshVerificationBtn.disabled = true;
  try {
    await reload(currentUser);
    currentUser = auth.currentUser;
    const synced = await syncUserProfile(currentUser);
    currentProfile = synced;
    renderProfileHeader(currentUser, synced);
    showFeedback(
      currentUser.emailVerified
        ? "Email verification confirmed!"
        : "Email is not verified yet. Check your inbox.",
      currentUser.emailVerified ? "success" : "error"
    );
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
  } finally {
    refreshVerificationBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  logoutBtn.textContent = "Signing out...";
  try {
    if (unsubEffects) unsubEffects();
    if (unsubUserLikes) unsubUserLikes();
    await signOut(auth);
    window.location.href = "./index.html#home";
  } catch (err) {
    showFeedback(mapAuthError(err), "error");
    logoutBtn.disabled = false;
    logoutBtn.textContent = "Sign out";
  }
});
