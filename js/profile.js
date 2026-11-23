import {
  auth,
  signOut,
  reload,
  sendEmailVerification,
  syncUserProfile,
  getUserProfile,
  getPublicProfile,
  syncPublicProfileLikes,
  updateUserProfileDoc,
  mapAuthError,
  mapFirestoreUserError,
  isSafeHttpUrl,
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

const urlParams = new URLSearchParams(window.location.search);
const requestedUid = urlParams.get("uid")?.trim() || "";
const requestedAuthor = urlParams.get("author")?.trim() || "";

const loadingEl = document.getElementById("profile-loading");
const contentEl = document.getElementById("profile-content");
const backLinkEl = document.getElementById("profile-back-link");
const modeBadgeEl = document.getElementById("profile-mode-badge");
const feedbackEl = document.getElementById("profile-feedback");

const avatarWrapEl = document.getElementById("profile-avatar-wrap");
const headerNameEl = document.getElementById("profile-header-name");
const headerEmailEl = document.getElementById("profile-header-email");
const headerBioEl = document.getElementById("profile-header-bio");
const verifyRowEl = document.getElementById("profile-verify-row");
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
let targetPublicProfile = null;
let viewMode = "self"; // "self" | "public-user" | "author"
let profileInitialized = false;
let activeTab = "mine";
let effectsLikesMap = {};
let userLikesSet = new Set();
let unsubEffects = null;
let unsubUserLikes = null;
let initialPublicLikesSynced = false;

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
  const safePhoto = isSafeHttpUrl(photoURL);
  if (safePhoto) {
    const img = document.createElement("img");
    img.src = safePhoto;
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

function configurePrivateControlsVisibility(isSelf) {
  if (backLinkEl) backLinkEl.hidden = isSelf;
  if (toggleEditBtn) toggleEditBtn.hidden = !isSelf;
  if (logoutBtn) logoutBtn.hidden = !isSelf;
  if (editPanelEl && !isSelf) editPanelEl.hidden = true;
  if (headerEmailEl) {
    headerEmailEl.hidden = !isSelf;
    if (!isSelf) headerEmailEl.textContent = "";
  }
  if (verifyRowEl) verifyRowEl.hidden = !isSelf;
}

function renderOwnHeader(user, profile) {
  configurePrivateControlsVisibility(true);
  if (modeBadgeEl) modeBadgeEl.hidden = true;

  const displayName = profile?.displayName || user.displayName || "CardUI User";
  const email = profile?.email || user.email || "";
  const photoURL = profile?.photoURL || user.photoURL || "";
  const bio = profile?.bio || "";

  document.title = `${displayName} — CARDUi`;
  headerNameEl.textContent = displayName;
  headerEmailEl.textContent = email;
  headerEmailEl.hidden = !email;

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
    if (verificationActionsEl) {
      verificationActionsEl.remove();
    }
  } else {
    verifiedBadgeEl.textContent = "Email not verified";
    verifiedBadgeEl.className = "cu-status-text unverified";
    if (verificationActionsEl) {
      verificationActionsEl.hidden = false;
    }
  }

  editNameInput.value = displayName;
  editBioInput.value = bio;
  updateBioCounter();
}

function renderPublicUserHeader(pubProfile) {
  configurePrivateControlsVisibility(false);
  if (modeBadgeEl) {
    modeBadgeEl.textContent = "Member Profile";
    modeBadgeEl.hidden = false;
  }

  const displayName = pubProfile?.displayName || "CardUI Member";
  const photoURL = pubProfile?.photoURL || "";
  const bio = pubProfile?.bio || "";

  document.title = `${displayName} — CARDUi`;
  headerNameEl.textContent = displayName;

  if (bio) {
    headerBioEl.textContent = bio;
    headerBioEl.hidden = false;
  } else {
    headerBioEl.textContent = "";
    headerBioEl.hidden = true;
  }

  renderAvatar(photoURL, displayName);
}

function renderAuthorHeader(authorName, authorEffects) {
  configurePrivateControlsVisibility(false);
  if (modeBadgeEl) {
    modeBadgeEl.textContent = "Contributor";
    modeBadgeEl.hidden = false;
  }

  document.title = `${authorName} — CARDUi`;
  headerNameEl.textContent = authorName;

  const repoNote =
    authorEffects.length > 0
      ? `Open-source CardUI contributor · ${authorEffects.length} published effect${authorEffects.length > 1 ? "s" : ""}`
      : "Open-source CardUI contributor";
  headerBioEl.textContent = repoNote;
  headerBioEl.hidden = false;

  renderAvatar("", authorName);
}

function renderEffectRow(effect) {
  const count = Number(effectsLikesMap[effect.id] || 0);
  return `
    <div class="cu-row">
      <div class="cu-av">${effect.num}</div>
      <div class="nm">
        <strong>UI-${effect.num} · ${escapeHtml(effect.name)}</strong>
        <small>by <a href="./profile.html?author=${encodeURIComponent(effect.author)}" style="color:inherit;text-decoration:underline">${escapeHtml(effect.author)}</a></small>
      </div>
      <span class="cu-row-likes">♥ ${count}</span>
      <a href="./index.html?effect=${effect.num}#explore" class="cu-btn cu-ghost">View</a>
    </div>
  `;
}

function renderStatsAndLists() {
  if (!currentUser) return;

  const board = buildContributorsLeaderboard(effectsLikesMap);

  if (viewMode === "author") {
    const authorEffects = EFFECTS_CATALOG.filter(
      (e) => e.author.toLowerCase() === requestedAuthor.toLowerCase()
    );
    const likesReceived = authorEffects.reduce(
      (sum, e) => sum + Number(effectsLikesMap[e.id] || 0),
      0
    );
    const rankIdx = board.findIndex(
      (entry) => entry.author.toLowerCase() === requestedAuthor.toLowerCase()
    );

    statContributedEl.textContent = String(authorEffects.length);
    statLikesReceivedEl.textContent = String(likesReceived);
    statFavouritesEl.textContent = "–";
    statRankEl.textContent = rankIdx >= 0 ? `#${rankIdx + 1}` : "–";

    activeTab = "mine";
    tabMineBtn.textContent = `Effects (${authorEffects.length})`;
    tabMineBtn.classList.add("on");
    tabMineBtn.setAttribute("aria-selected", "true");
    tabFavsBtn.hidden = true;

    effectsListEl.innerHTML = authorEffects.length
      ? authorEffects.map(renderEffectRow).join("")
      : `
        <div class="cu-gate" style="padding:36px 20px">
          <p class="cu-sub" style="margin:0">No published effects found for "${escapeHtml(requestedAuthor)}".</p>
        </div>
      `;
    return;
  }

  if (viewMode === "public-user") {
    const likedIds = new Set(
      Array.isArray(targetPublicProfile?.likedEffectIds)
        ? targetPublicProfile.likedEffectIds
        : []
    );
    const favEffects = EFFECTS_CATALOG.filter((e) => likedIds.has(e.id));

    statContributedEl.textContent = "0";
    statLikesReceivedEl.textContent = "0";
    statFavouritesEl.textContent = String(favEffects.length);
    statRankEl.textContent = "–";

    activeTab = "favs";
    tabMineBtn.hidden = true;
    tabFavsBtn.hidden = false;
    tabFavsBtn.textContent = `Favourites (${favEffects.length})`;
    tabFavsBtn.classList.add("on");
    tabFavsBtn.setAttribute("aria-selected", "true");

    effectsListEl.innerHTML = favEffects.length
      ? favEffects.map(renderEffectRow).join("")
      : `
        <div class="cu-gate" style="padding:36px 20px">
          <p class="cu-sub" style="margin:0">This member hasn't saved any favourite effects yet.</p>
        </div>
      `;
    return;
  }

  // Own profile view
  tabMineBtn.hidden = false;
  tabFavsBtn.hidden = false;

  const myEffects = EFFECTS_CATALOG.filter((e) =>
    doesUserMatchAuthor(currentUser, currentProfile, e.author)
  );
  const favEffects = EFFECTS_CATALOG.filter((e) => userLikesSet.has(e.id));

  const likesReceived = myEffects.reduce(
    (sum, e) => sum + Number(effectsLikesMap[e.id] || 0),
    0
  );

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
        <p class="cu-sub" style="margin-bottom:14px">No contributed effects linked to this verified account yet.</p>
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
    const redirectTarget = `profile.html${window.location.search}`;
    window.location.replace(`./login.html?redirect=${encodeURIComponent(redirectTarget)}`);
    return;
  }

  currentUser = user;
  if (profileInitialized) return;
  profileInitialized = true;

  if (requestedAuthor) {
    viewMode = "author";
  } else if (requestedUid && requestedUid !== user.uid) {
    viewMode = "public-user";
  } else {
    viewMode = "self";
  }

  unsubEffects = subscribeEffectsLikes(
    (map) => {
      effectsLikesMap = map;
      renderStatsAndLists();
    },
    (err) => {
      console.warn("Effects likes listener notice:", mapFirestoreUserError(err));
    }
  );

  try {
    if (viewMode === "author") {
      const authorEffects = EFFECTS_CATALOG.filter(
        (e) => e.author.toLowerCase() === requestedAuthor.toLowerCase()
      );
      renderAuthorHeader(requestedAuthor, authorEffects);
      renderStatsAndLists();
    } else if (viewMode === "public-user") {
      const pub = await getPublicProfile(requestedUid);
      if (!pub) {
        renderPublicUserHeader({ displayName: "Member Not Found", bio: "" });
        showFeedback("This community member profile could not be found.", "error");
      } else {
        targetPublicProfile = pub;
        renderPublicUserHeader(pub);
      }
      renderStatsAndLists();
    } else {
      unsubUserLikes = subscribeUserLikes(
        user.uid,
        (likedSet) => {
          userLikesSet = likedSet;
          renderStatsAndLists();
          if (!initialPublicLikesSynced) {
            initialPublicLikesSynced = true;
            syncPublicProfileLikes(user, Array.from(likedSet)).catch(() => {});
          }
        },
        (err) => {
          console.warn("User likes listener notice:", mapFirestoreUserError(err));
        }
      );

      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = await syncUserProfile(user);
      }
      currentProfile = profile;
      renderOwnHeader(user, profile);
      renderStatsAndLists();
    }
  } catch (err) {
    if (viewMode === "self") {
      renderOwnHeader(user, null);
    } else {
      renderPublicUserHeader({ displayName: "Profile Unavailable", bio: "" });
    }
    renderStatsAndLists();
    showFeedback(mapFirestoreUserError(err), "error");
  } finally {
    loadingEl.hidden = true;
    contentEl.hidden = false;
  }
});

tabMineBtn.addEventListener("click", () => {
  if (viewMode === "public-user") return;
  activeTab = "mine";
  renderStatsAndLists();
});

tabFavsBtn.addEventListener("click", () => {
  if (viewMode === "author") return;
  activeTab = "favs";
  renderStatsAndLists();
});

toggleEditBtn.addEventListener("click", () => {
  if (viewMode !== "self") return;
  clearFeedback();
  editPanelEl.hidden = !editPanelEl.hidden;
  if (!editPanelEl.hidden && currentUser) {
    renderOwnHeader(currentUser, currentProfile);
    editNameInput.focus();
  }
});

cancelEditBtn.addEventListener("click", () => {
  clearFeedback();
  editPanelEl.hidden = true;
  if (currentUser && viewMode === "self") {
    renderOwnHeader(currentUser, currentProfile);
  }
});

editBioInput.addEventListener("input", updateBioCounter);

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || viewMode !== "self") return;
  clearFeedback();

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";
  try {
    const updated = await updateUserProfileDoc(currentUser, {
      displayName: editNameInput.value,
      bio: editBioInput.value,
    });
    currentProfile = updated;
    renderOwnHeader(currentUser, updated);
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

if (resendVerificationBtn) {
  resendVerificationBtn.addEventListener("click", async () => {
    if (!currentUser || viewMode !== "self" || currentUser.emailVerified) return;
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
}

if (refreshVerificationBtn) {
  refreshVerificationBtn.addEventListener("click", async () => {
    if (!currentUser || viewMode !== "self") return;
    clearFeedback();
    refreshVerificationBtn.disabled = true;
    try {
      await reload(currentUser);
      currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.getIdToken(true);
      }
      const synced = await syncUserProfile(currentUser);
      currentProfile = synced;
      renderOwnHeader(currentUser, synced);
      renderStatsAndLists();
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
}

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
