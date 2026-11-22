import {
  auth,
  googleProvider,
  signInWithPopup,
  syncUserProfile,
  mapAuthError,
  mapFirestoreUserError,
} from "./firebase-client.js";
import { initAuthNav } from "./auth-nav.js";
import {
  EFFECTS_CATALOG,
  EFFECT_CATEGORIES,
  getEffectById,
  getEffectByNum,
  getInitials,
  buildContributorsLeaderboard,
} from "./effects-data.js";
import {
  subscribeEffectsLikes,
  subscribeUserLikes,
  toggleEffectLike,
} from "./likes-service.js";

const VIEWS = ["home", "explore", "contributors", "profile"];

let currentUser = null;
let effectsLikesMap = {};
let userLikesSet = new Set();
let activeCategory = "all";
let unsubscribeUserLikes = null;
let cachedIndexCssText = null;
let toastTimer = null;

const likeButtonsById = new Map();
const cardElementsById = new Map();

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

function showToast(message) {
  const toastEl = document.getElementById("cu-toast");
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("open");
  }, 4200);
}

function getLikesCount(effectId) {
  return Number(effectsLikesMap[effectId] || 0);
}

function getCurrentRoute() {
  const hash = (window.location.hash || "#home").replace(/^#/, "").toLowerCase();
  return VIEWS.includes(hash) ? hash : "home";
}

function updateLikesUI() {
  EFFECTS_CATALOG.forEach((effect) => {
    const btn = likeButtonsById.get(effect.id);
    if (!btn) return;
    const count = getLikesCount(effect.id);
    const liked = Boolean(currentUser && userLikesSet.has(effect.id));
    btn.classList.toggle("liked", liked);
    btn.setAttribute("aria-pressed", String(liked));
    btn.innerHTML = `<span aria-hidden="true">${liked ? "♥" : "♡"}</span> <span>${count}</span>`;
  });

  const route = getCurrentRoute();
  if (route === "contributors") {
    renderContributorsView();
  }
}

function renderFilterBar() {
  const bar = document.getElementById("cu-filter-bar");
  if (!bar) return;

  bar.innerHTML = "";
  EFFECT_CATEGORIES.forEach((cat) => {
    const count =
      cat.id === "all"
        ? EFFECTS_CATALOG.length
        : EFFECTS_CATALOG.filter((e) => e.category === cat.id).length;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `cu-filter-btn${activeCategory === cat.id ? " on" : ""}`;
    btn.textContent = `${cat.label} (${count})`;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      applyCategoryFilter();
      bar.querySelectorAll(".cu-filter-btn").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
    });
    bar.appendChild(btn);
  });
}

function applyCategoryFilter() {
  let visibleCount = 0;
  EFFECTS_CATALOG.forEach((effect) => {
    const el = cardElementsById.get(effect.id);
    if (!el) return;
    const show = activeCategory === "all" || effect.category === activeCategory;
    el.hidden = !show;
    if (show) visibleCount += 1;
  });

  const emptyEl = document.getElementById("cu-filter-empty");
  if (emptyEl) {
    emptyEl.hidden = visibleCount > 0;
  }
}

function jumpToEffect(effectId) {
  const effect = getEffectById(effectId);
  if (!effect) return;

  if (activeCategory !== "all" && effect.category !== activeCategory) {
    activeCategory = "all";
    renderFilterBar();
    applyCategoryFilter();
  }

  const cardEl = cardElementsById.get(effectId);
  if (!cardEl) return;

  const scrollAndFlash = () => {
    const titleEl = cardEl.querySelector(".effect-title") || cardEl;
    titleEl.scrollIntoView({ behavior: "smooth", block: "center" });
    cardEl.classList.add("cu-flash");
    setTimeout(() => cardEl.classList.remove("cu-flash"), 1900);
  };

  if (getCurrentRoute() !== "explore") {
    window.location.hash = "explore";
    setTimeout(scrollAndFlash, 160);
  } else {
    scrollAndFlash();
  }
}

function renderContributorsView() {
  const statsEl = document.getElementById("lb-stats");
  const listEl = document.getElementById("lb");
  if (!statsEl || !listEl) return;

  if (!currentUser) {
    statsEl.innerHTML = "";
    listEl.innerHTML = `
      <div class="cu-gate">
        <h2>Contributors</h2>
        <p class="cu-sub">Sign in to meet the community and explore the live contributors leaderboard.</p>
        <div class="cu-cta">
          <button type="button" class="cu-btn cu-primary" id="lb-signin-btn">Continue with Google</button>
          <a href="./login.html" class="cu-btn cu-ghost">Sign in with Email</a>
        </div>
      </div>
    `;
    const btn = document.getElementById("lb-signin-btn");
    if (btn) btn.addEventListener("click", () => handleGoogleSignIn());
    return;
  }

  const board = buildContributorsLeaderboard(effectsLikesMap);
  const totalLikes = EFFECTS_CATALOG.reduce((sum, e) => sum + getLikesCount(e.id), 0);

  statsEl.innerHTML = `
    <div class="cu-stat"><b>${EFFECTS_CATALOG.length}</b><span>Effects</span></div>
    <div class="cu-stat"><b>${board.length}</b><span>Contributors</span></div>
    <div class="cu-stat"><b>${totalLikes}</b><span>Total likes</span></div>
  `;

  listEl.innerHTML = board
    .map((entry, idx) => {
      const firstEffect = EFFECTS_CATALOG.find((e) => e.author === entry.author);
      return `
        <div class="cu-row">
          <div class="cu-rank">#${idx + 1}</div>
          <div class="cu-av">${escapeHtml(getInitials(entry.author))}</div>
          <div class="nm">
            <strong>${escapeHtml(entry.author)}</strong>
            <small>${entry.effectsCount} effect${entry.effectsCount > 1 ? "s" : ""} · ♥ ${entry.likesCount} likes</small>
          </div>
          <button type="button" class="cu-btn cu-ghost" data-jump-author="${escapeHtml(firstEffect?.id || "ui-1")}">View effects</button>
        </div>
      `;
    })
    .join("");
}

function renderProfileGateView() {
  const pfEl = document.getElementById("pf");
  if (!pfEl) return;

  if (currentUser) {
    window.location.href = "./profile.html";
    return;
  }

  pfEl.innerHTML = `
    <div class="cu-gate">
      <h2>Your Profile</h2>
      <p class="cu-sub">Sign in to view your contributed effects, likes received, and saved favourites.</p>
      <div class="cu-cta">
        <button type="button" class="cu-btn cu-primary" id="pf-signin-btn">Continue with Google</button>
        <a href="./login.html" class="cu-btn cu-ghost">Sign in with Email</a>
      </div>
    </div>
  `;
  const btn = document.getElementById("pf-signin-btn");
  if (btn) btn.addEventListener("click", () => handleGoogleSignIn());
}

function syncRoute() {
  const route = getCurrentRoute();
  if (route === "profile" && currentUser) {
    window.location.href = "./profile.html";
    return;
  }

  VIEWS.forEach((v) => {
    const viewEl = document.getElementById(`v-${v}`);
    if (viewEl) viewEl.classList.toggle("on", v === route);
  });

  document.querySelectorAll(".cu-links a[data-nav]").forEach((a) => {
    a.classList.toggle("on", a.getAttribute("data-nav") === route);
  });

  if (route === "contributors") renderContributorsView();
  if (route === "profile") renderProfileGateView();

  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ---------- Auth Modal & Real Firebase Sign-In ---------- */
const authModal = document.getElementById("cu-modal");
const authTitle = document.getElementById("cu-title");
const authSub = document.getElementById("cu-sub");
const authGoogleLabel = document.getElementById("cu-google-label");
const authEmailLink = document.getElementById("cu-modal-email-link");
const authFeedback = document.getElementById("cu-modal-feedback");

function openAuthModal(isSignUp = false, customSubtitle = "") {
  if (!authModal) return;
  if (authFeedback) {
    authFeedback.hidden = true;
    authFeedback.textContent = "";
  }
  if (authTitle) authTitle.textContent = isSignUp ? "Create your account" : "Welcome to CardUi";
  if (authSub) {
    authSub.textContent =
      customSubtitle ||
      (isSignUp
        ? "Sign up in one click to save favourites and track your effects."
        : "Sign in to like effects, save favourites, and explore contributors.");
  }
  if (authGoogleLabel) {
    authGoogleLabel.textContent = isSignUp ? "Sign up with Google" : "Continue with Google";
  }
  if (authEmailLink) {
    authEmailLink.href = isSignUp ? "./signup.html" : "./login.html";
    authEmailLink.textContent = isSignUp ? "Or sign up with Email & Password" : "Or sign in with Email & Password";
  }
  authModal.classList.add("open");
}

function closeAuthModal() {
  if (authModal) authModal.classList.remove("open");
}

async function handleGoogleSignIn() {
  const googleBtn = document.getElementById("cu-google");
  if (googleBtn) googleBtn.disabled = true;
  if (authFeedback) {
    authFeedback.hidden = true;
    authFeedback.textContent = "";
  }

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    try {
      await syncUserProfile(credential.user);
    } catch (fsErr) {
      console.warn("Firestore sync deferred:", mapFirestoreUserError(fsErr));
    }
    closeAuthModal();
    showToast(`Signed in as ${credential.user.displayName || credential.user.email}`);
  } catch (err) {
    const message = mapAuthError(err);
    if (authModal?.classList.contains("open") && authFeedback) {
      authFeedback.textContent = message;
      authFeedback.className = "auth-feedback error";
      authFeedback.hidden = false;
    } else {
      showToast(message);
    }
  } finally {
    if (googleBtn) googleBtn.disabled = false;
  }
}

/* ---------- Code Viewer Modal (HTML / CSS / JS) ---------- */
const codeModal = document.getElementById("cu-code-modal");
let activeCodeTabs = { html: "", css: "", js: "" };
let activeCodeTabKey = "html";

async function getIndexCssText() {
  if (cachedIndexCssText !== null) return cachedIndexCssText;
  try {
    const res = await fetch("./index.css");
    cachedIndexCssText = await res.text();
  } catch {
    cachedIndexCssText = "";
  }
  return cachedIndexCssText;
}

function extractCssForEffect(cssText, effect) {
  if (!cssText || !effect.cssStart) {
    return "/* View full CSS in index.css */";
  }
  const startIdx = cssText.indexOf(effect.cssStart);
  if (startIdx === -1) return "/* View full CSS in index.css */";

  let endIdx = cssText.length;
  if (effect.cssEnd) {
    const foundEnd = cssText.indexOf(effect.cssEnd, startIdx + effect.cssStart.length);
    if (foundEnd !== -1) endIdx = foundEnd;
  }
  return cssText.slice(startIdx, endIdx).trim();
}

function extractHtmlForEffect(cardEl) {
  const container =
    cardEl.querySelector(".container") ||
    cardEl.querySelector(".cards-list") ||
    cardEl.querySelector(".card7") ||
    cardEl.querySelector(".card9") ||
    cardEl.querySelector(".container10") ||
    cardEl.querySelector(".container21") ||
    cardEl.querySelector(".container22") ||
    cardEl.querySelector(".container23") ||
    cardEl.querySelector(".container25") ||
    cardEl.querySelector(".containerr") ||
    cardEl.querySelector(".abc") ||
    cardEl.querySelector(".wrapper19") ||
    cardEl.querySelector(".container-19") ||
    cardEl.querySelector(".row");

  if (!container) return cardEl.innerHTML.trim();
  return container.outerHTML.trim();
}

function renderCodeModalTab(tabKey) {
  activeCodeTabKey = tabKey;
  const codePre = document.getElementById("cu-code-pre");
  const tabBtns = document.querySelectorAll("#cu-code-tabs-group button");
  tabBtns.forEach((b) => {
    b.classList.toggle("on", b.getAttribute("data-code-tab") === tabKey);
  });
  if (codePre) {
    codePre.textContent = activeCodeTabs[tabKey] || "";
  }
}

async function openCodeModal(effectId) {
  const effect = getEffectById(effectId);
  const cardEl = cardElementsById.get(effectId);
  if (!effect || !cardEl || !codeModal) return;

  const titleEl = document.getElementById("cu-code-title");
  const authorEl = document.getElementById("cu-code-author");
  const jsTabBtn = document.querySelector('#cu-code-tabs-group button[data-code-tab="js"]');
  const repoLink = document.getElementById("cu-code-repo");

  if (titleEl) titleEl.textContent = `UI-${effect.num} · ${effect.name}`;
  if (authorEl) authorEl.textContent = `by ${effect.author}`;
  if (repoLink) repoLink.href = effect.repoUrl;

  const cssText = await getIndexCssText();
  activeCodeTabs = {
    html: extractHtmlForEffect(cardEl),
    css: extractCssForEffect(cssText, effect),
    js: effect.jsSnippet || "",
  };

  if (jsTabBtn) {
    jsTabBtn.hidden = !effect.hasJs;
  }

  renderCodeModalTab("html");
  codeModal.classList.add("open");
}

function closeCodeModal() {
  if (codeModal) codeModal.classList.remove("open");
}

/* ---------- Card Mounting & Interactive Bars ---------- */
function hydrateEffectCards() {
  const countBadge = document.getElementById("cu-count");
  if (countBadge) {
    const uniqueContributors = new Set(EFFECTS_CATALOG.map((e) => e.author)).size;
    countBadge.textContent = `${EFFECTS_CATALOG.length} effects · ${uniqueContributors} contributors`;
  }

  document.querySelectorAll(".cu-effect-card[data-effect-id]").forEach((cardEl) => {
    const effectId = cardEl.getAttribute("data-effect-id");
    const effect = getEffectById(effectId);
    if (!effect) return;

    cardElementsById.set(effectId, cardEl);

    // Ensure the heading displays UI number, Effect Name, and Contributor clearly
    const heading = cardEl.querySelector(".effect-title");
    if (heading) {
      heading.innerHTML = `${effect.num}. UI-${effect.num} by <em>${escapeHtml(effect.author)}</em><span class="cu-effect-name">${escapeHtml(effect.name)}</span>`;
    }

    // Build interactive like + copy code bar below .effect-code
    const effectCodeEl = cardEl.querySelector(".effect-code");
    let bar = cardEl.querySelector(".cu-likebar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "cu-likebar cu-shell";
      if (effectCodeEl && effectCodeEl.parentNode) {
        effectCodeEl.parentNode.insertBefore(bar, effectCodeEl.nextSibling);
      } else {
        cardEl.appendChild(bar);
      }
    }

    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    likeBtn.className = "cu-like";
    likeBtn.setAttribute("aria-label", `Like UI-${effect.num} ${effect.name}`);
    likeBtn.innerHTML = `<span aria-hidden="true">♡</span> <span>0</span>`;
    likeBtn.addEventListener("click", async () => {
      if (!currentUser) {
        openAuthModal(false, `Sign in to like UI-${effect.num} (${effect.name}) and save it to your favourites.`);
        return;
      }
      const currentlyLiked = userLikesSet.has(effect.id);
      likeBtn.disabled = true;
      try {
        const nowLiked = await toggleEffectLike(currentUser, effect.id, currentlyLiked);
        if (nowLiked) {
          userLikesSet.add(effect.id);
          effectsLikesMap[effect.id] = getLikesCount(effect.id) + 1;
        } else {
          userLikesSet.delete(effect.id);
          effectsLikesMap[effect.id] = Math.max(0, getLikesCount(effect.id) - 1);
        }
        updateLikesUI();
      } catch (err) {
        showToast(mapFirestoreUserError(err));
      } finally {
        likeBtn.disabled = false;
      }
    });

    const copyCodeBtn = document.createElement("button");
    copyCodeBtn.type = "button";
    copyCodeBtn.className = "cu-copy-btn";
    copyCodeBtn.textContent = "Copy Code";
    copyCodeBtn.addEventListener("click", () => openCodeModal(effect.id));

    bar.innerHTML = "";
    bar.appendChild(likeBtn);
    bar.appendChild(copyCodeBtn);
    likeButtonsById.set(effect.id, likeBtn);
  });
}

/* ---------- Search Dropdown & Global Click Listeners ---------- */
function initSearchAndEvents() {
  const searchInput = document.getElementById("cu-search");
  const resultsBox = document.getElementById("cu-results");

  if (searchInput && resultsBox) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) {
        resultsBox.classList.remove("open");
        resultsBox.innerHTML = "";
        return;
      }
      const matches = EFFECTS_CATALOG.filter((e) =>
        `ui-${e.num} ${e.num} ${e.name} ${e.author}`.toLowerCase().includes(q)
      ).slice(0, 8);

      resultsBox.innerHTML = matches.length
        ? matches
            .map(
              (e) =>
                `<button type="button" data-jump-effect="${e.id}"><span><b>UI-${e.num}</b> · ${escapeHtml(e.name)}</span><small>${escapeHtml(e.author)}</small></button>`
            )
            .join("")
        : `<p class="cu-sub" style="padding:12px 14px;margin:0">No matching effects found.</p>`;
      resultsBox.classList.add("open");
    });
  }

  document.addEventListener("click", (ev) => {
    const jumpEffectBtn = ev.target.closest("[data-jump-effect]");
    const jumpAuthorBtn = ev.target.closest("[data-jump-author]");

    if (jumpEffectBtn) {
      if (resultsBox) resultsBox.classList.remove("open");
      jumpToEffect(jumpEffectBtn.getAttribute("data-jump-effect"));
    }
    if (jumpAuthorBtn) {
      jumpToEffect(jumpAuthorBtn.getAttribute("data-jump-author"));
    }
    if (resultsBox && !ev.target.closest(".cu-searchwrap")) {
      resultsBox.classList.remove("open");
    }
  });

  // Header & Home CTA Modal triggers (intercept sign in / sign up on index.html for instant Google + Email modal)
  const signinBtn = document.getElementById("cu-signin");
  const signupBtn = document.getElementById("cu-signup");
  const homeJoinBtn = document.getElementById("home-join");
  const googleModalBtn = document.getElementById("cu-google");
  const closeAuthBtn = document.getElementById("cu-close");

  if (signinBtn) {
    signinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal(false);
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal(true);
    });
  }
  if (homeJoinBtn) {
    homeJoinBtn.addEventListener("click", () => openAuthModal(true));
  }
  if (googleModalBtn) {
    googleModalBtn.addEventListener("click", handleGoogleSignIn);
  }
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener("click", closeAuthModal);
  }
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Code modal events
  const closeCodeBtn = document.getElementById("cu-code-close");
  const copySnippetBtn = document.getElementById("cu-copy-snippet");
  if (closeCodeBtn) closeCodeBtn.addEventListener("click", closeCodeModal);
  if (codeModal) {
    codeModal.addEventListener("click", (e) => {
      if (e.target === codeModal) closeCodeModal();
    });
  }
  document.querySelectorAll("#cu-code-tabs-group button").forEach((btn) => {
    btn.addEventListener("click", () => {
      renderCodeModalTab(btn.getAttribute("data-code-tab"));
    });
  });
  if (copySnippetBtn) {
    copySnippetBtn.addEventListener("click", async () => {
      const code = activeCodeTabs[activeCodeTabKey] || "";
      try {
        await navigator.clipboard.writeText(code);
        const old = copySnippetBtn.textContent;
        copySnippetBtn.textContent = "Copied!";
        setTimeout(() => {
          copySnippetBtn.textContent = old;
        }, 1600);
      } catch {
        showToast("Unable to copy to clipboard.");
      }
    });
  }

  // Escape closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAuthModal();
      closeCodeModal();
    }
  });

  // Back to top button
  const backTopBtn = document.getElementById("cu-backtop");
  if (backTopBtn) {
    window.addEventListener(
      "scroll",
      () => {
        backTopBtn.classList.toggle("visible", window.scrollY > 420);
      },
      { passive: true }
    );
    backTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

/* ---------- Boot ---------- */
hydrateEffectCards();
renderFilterBar();
applyCategoryFilter();
initSearchAndEvents();

// Real-time public like counts from Cloud Firestore (/effects)
subscribeEffectsLikes(
  (map) => {
    effectsLikesMap = map;
    updateLikesUI();
  },
  (err) => {
    console.warn("Effects likes listener notice:", mapFirestoreUserError(err));
  }
);

initAuthNav((user) => {
  currentUser = user;

  const homeJoinCard = document.getElementById("cu-home-join-card");
  if (homeJoinCard) homeJoinCard.hidden = Boolean(user);

  if (unsubscribeUserLikes) {
    unsubscribeUserLikes();
    unsubscribeUserLikes = null;
  }

  if (user) {
    unsubscribeUserLikes = subscribeUserLikes(
      user.uid,
      (likedSet) => {
        userLikesSet = likedSet;
        updateLikesUI();
      },
      (err) => {
        console.warn("User likes listener notice:", mapFirestoreUserError(err));
      }
    );
  } else {
    userLikesSet = new Set();
    updateLikesUI();
  }

  const route = getCurrentRoute();
  if (route === "contributors") renderContributorsView();
  if (route === "profile") renderProfileGateView();
});

window.addEventListener("hashchange", syncRoute);
syncRoute();

// Support deep link from profile.html: ./index.html?effect=1#explore
const params = new URLSearchParams(window.location.search);
const deepEffectParam = params.get("effect");
if (deepEffectParam) {
  const match = getEffectByNum(deepEffectParam) || getEffectById(deepEffectParam);
  if (match) {
    setTimeout(() => jumpToEffect(match.id), 220);
  }
}
