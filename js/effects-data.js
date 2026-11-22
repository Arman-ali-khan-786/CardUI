// Canonical catalog of all 25 CardUI effects with descriptive effect names,
// contributor attribution, categories, source repositories, and CSS section markers.

export const EFFECTS_CATALOG = [
  {
    id: "ui-1",
    num: 1,
    name: "Staggered Curtain Reveal",
    author: "Arman Ali Khan",
    category: "reveal",
    repoUrl: "https://github.com/Arman-ali-khan-786/CardUI",
    cssStart: "/* ----------------------------------  UI-1 css code ------------------------------------ */",
    cssEnd: "/* -------------------------------  UI-2 css code --------------------------------- */",
  },
  {
    id: "ui-2",
    num: 2,
    name: "Sliding Banner Reveal",
    author: "Arman Ali Khan",
    category: "reveal",
    repoUrl: "https://github.com/Arman-ali-khan-786/CardUI",
    cssStart: "/* -------------------------------  UI-2 css code --------------------------------- */",
    cssEnd: "/* -------------------------------  UI-3 css code --------------------------------- */",
  },
  {
    id: "ui-3",
    num: 3,
    name: "Border-Draw Button Profile",
    author: "Pritam Panda",
    category: "profile",
    repoUrl: "https://github.com/Pritam0077/CardUI",
    cssStart: "/* -------------------------------  UI-3 css code --------------------------------- */",
    cssEnd: "/* -------------------------------  UI-4 css code --------------------------------- */",
  },
  {
    id: "ui-4",
    num: 4,
    name: "Scanning Beam Profile",
    author: "Mohammad Zeeshan",
    category: "glass",
    repoUrl: "https://github.com/zeeshankhan00/CardUI/tree/master",
    cssStart: "/* -------------------------------  UI-4 css code --------------------------------- */",
    cssEnd: "/* Harshit's card css */",
  },
  {
    id: "ui-5",
    num: 5,
    name: "3D Hinged Door Reveal",
    author: "HS07",
    category: "3d",
    repoUrl: "https://github.com/hs-07/CardUI",
    cssStart: "/* Harshit's card css */",
    cssEnd: "/*Divyanshu card*/",
  },
  {
    id: "ui-6",
    num: 6,
    name: "Zoom-Down Media Card",
    author: "DIVYANSHU PRIYAVRAT",
    category: "profile",
    repoUrl: "https://github.com/DIVYANSHU8055/CardUI",
    cssStart: "/*Divyanshu card*/",
    cssEnd: ".container1 {",
  },
  {
    id: "ui-7",
    num: 7,
    name: "Morphing Circle-to-Card",
    author: "Saikiran Voladri",
    category: "reveal",
    repoUrl: "https://github.com/SaikiranVoladri/hactoberfest-CardUi",
    cssStart: ".container1 {",
    cssEnd: "/* -------------------------------  UI-8 css code --------------------------------- */",
    hasJs: true,
    jsSnippet: `const card7Img = document.querySelector(".card7 .wrappers img");
const card7Icons = document.querySelector(".card7 .icons");
if (card7Img && card7Icons) {
  card7Img.addEventListener("click", () => {
    card7Img.classList.toggle("active");
    card7Icons.classList.toggle("active");
  });
}`,
  },
  {
    id: "ui-8",
    num: 8,
    name: "Dark Scrim & Social Slide-In",
    author: "ArieAR",
    category: "reveal",
    repoUrl: "https://github.com/ariear/CardUI",
    cssStart: "/* -------------------------------  UI-8 css code --------------------------------- */",
    cssEnd: "/* -------------------------------  UI-9 css code --------------------------------- */",
  },
  {
    id: "ui-9",
    num: 9,
    name: "Animated Neon Gradient Frame",
    author: "raghav-rama",
    category: "glass",
    repoUrl: "https://github.com/raghav-rama/CardUI",
    cssStart: "/* -------------------------------  UI-9 css code --------------------------------- */",
    cssEnd: "/* -------------------------------  UI-10 css code --------------------------------- */",
  },
  {
    id: "ui-10",
    num: 10,
    name: "Expanding Circle Spotlight",
    author: "Md Zaid Siddiqui",
    category: "reveal",
    repoUrl: "https://github.com/zaidsidd360/CardUI",
    cssStart: "/* -------------------------------  UI-10 css code --------------------------------- */",
    cssEnd: "/* -------------------------------  UI-11 css code --------------------------------- */",
  },
  {
    id: "ui-11",
    num: 11,
    name: "Frosted Glass Expand",
    author: "Anubhav Gupta",
    category: "glass",
    repoUrl: "https://github.com/Anubhavgupta18/CardUI",
    cssStart: "/* -------------------------------  UI-11 css code --------------------------------- */",
    cssEnd: "/* -------------------------------  UI-12 css code --------------------------------- */",
  },
  {
    id: "ui-12",
    num: 12,
    name: "Underline & Content Slide-Up",
    author: "Shivang Sharma",
    category: "reveal",
    repoUrl: "https://github.com/shivang1919/CardUI",
    cssStart: "/* -------------------------------  UI-12 css code --------------------------------- */",
    cssEnd: "/* ////////////////// break-point code for ui-1 card  ///////////////////// */",
  },
  {
    id: "ui-13",
    num: 13,
    name: "Shrinking Badge Morph",
    author: "Manu Coutinho",
    category: "profile",
    repoUrl: "https://github.com/ManuCoutinho/CardUI",
    cssStart: "/* ----------------------------------  UI-13 css code ------------------------------------ */",
    cssEnd: "/* ----------------------------------  End for UI-13 css code ------------------------------------ */",
  },
  {
    id: "ui-14",
    num: 14,
    name: "Dual-Face Split Reveal",
    author: "Subrat Kumar",
    category: "reveal",
    repoUrl: "https://github.com/subratkumar46/CardUI",
    cssStart: "/* ----------------------------------  UI-14 css code ------------------------------------ */",
    cssEnd: "/* ----------------------------------  End for UI-14 css code ------------------------------------ */",
  },
  {
    id: "ui-15",
    num: 15,
    name: "Backdrop Photo Swap",
    author: "Ipsita Senapati",
    category: "profile",
    repoUrl: "https://github.com/IpsitaSenapati/CardUI",
    cssStart: "/* ---------------------------------- UI-15 css code ------------------------------------ */",
    cssEnd: "/* ----------------------------------  End for UI-15 css code ------------------------------------ */",
  },
  {
    id: "ui-16",
    num: 16,
    name: "Parallax Slide-Up Drawer",
    author: "Subrat Kumar",
    category: "reveal",
    repoUrl: "https://github.com/subratkumar46/CardUI",
    cssStart: "/* ----------------------------------  Start for Subrat's UI-16 css code ------------------------------------ */",
    cssEnd: "/* ----------------------------------  End for Subrat's UI-16 css code ------------------------------------ */",
  },
  {
    id: "ui-17",
    num: 17,
    name: "Conic Neon Spin Border",
    author: "Ritvik Raj",
    category: "glass",
    repoUrl: "https://github.com/RitvikRaj0810/CardUI",
    cssStart: "/* ----------------------------------  Start for Ritvik's UI-17 css code ------------------------------------ */",
    cssEnd: "/* ----------------------------------  End for Ritvik's UI-17 css code ------------------------------------ */",
  },
  {
    id: "ui-18",
    num: 18,
    name: "Skewed Glassmorphic Glow",
    author: "T. Vijay Santosh Rao",
    category: "glass",
    repoUrl: "https://github.com/vijayNerdballer/CardUI",
    cssStart: "/* ----------------------------------  start of Vijay's UI-19 css code ------------------------------------ */",
    cssEnd: "/* ----------------------------------  Start for Sidhartha's UI-18 css code ------------------------------------ */",
  },
  {
    id: "ui-19",
    num: 19,
    name: "3D Flipping Cube Bio",
    author: "Sidhartha Mohanty",
    category: "3d",
    repoUrl: "https://github.com/sidhartha2002",
    cssStart: "/* ----------------------------------  Start for Sidhartha's UI-18 css code ------------------------------------ */",
    cssEnd: "/* start for charvi's card UI css */",
  },
  {
    id: "ui-20",
    num: 20,
    name: "3D Book-Cover Flip",
    author: "Charvi Bhargava",
    category: "3d",
    repoUrl: "https://github.com/charvibhargava/CardUI",
    cssStart: "/* start for charvi's card UI css */",
    cssEnd: "/* ---------------------- start of  UI - 21 -------------------------------  */",
  },
  {
    id: "ui-21",
    num: 21,
    name: "Clip-Path Spotlight Expand",
    author: "Nitin Pandita",
    category: "reveal",
    repoUrl: "https://github.com/nitin-pandita/CardUI",
    cssStart: "/* ---------------------- start of  UI - 21 -------------------------------  */",
    cssEnd: "/* start of card UI-22 */",
  },
  {
    id: "ui-22",
    num: 22,
    name: "Clean Gradient Profile Card",
    author: "Akash Dev",
    category: "profile",
    repoUrl: "https://github.com/AkashDev23/MyCard",
    cssStart: "/* start of card UI-22 */",
    cssEnd: "/* End of card UI-22 */",
  },
  {
    id: "ui-23",
    num: 23,
    name: "Floating Portrait Expand",
    author: "AseanK",
    category: "profile",
    repoUrl: "https://github.com/AseanK/CardUI",
    cssStart: "/* ---------------------------Begin UI-23------------------------*/",
    cssEnd: "/* ---------------------------END UI-23------------------------*/",
  },
  {
    id: "ui-24",
    num: 24,
    name: "Parallax Image Zoom & Rise",
    author: "Shivesh Nandan",
    category: "reveal",
    repoUrl: "https://github.com/ShiveshNandan/CardUI-Hacktober22",
    cssStart: "/* ======================== UI 25 begin ============================= */",
    cssEnd: "/* CSS for the \"to-top\" button */",
  },
  {
    id: "ui-25",
    num: 25,
    name: "3D Two-Sided Flip Card",
    author: "Aman Nadeem",
    category: "3d",
    repoUrl: "https://github.com/recdata/CardUI",
    cssStart: "/* ---------------------------Begin UI-24------------------------*/",
    cssEnd: "/* ---------------------------END UI-24------------------------*/",
  },
];

export const EFFECT_CATEGORIES = [
  { id: "all", label: "All Effects" },
  { id: "reveal", label: "Reveal & Slide" },
  { id: "3d", label: "3D & Flip" },
  { id: "glass", label: "Glass & Glow" },
  { id: "profile", label: "Profile Cards" },
];

const KNOWN_AUTHOR_EMAILS = {
  "alikhanarman786@gmail.com": "arman ali khan",
};

export function getEffectById(id) {
  return EFFECTS_CATALOG.find((e) => e.id === id) || null;
}

export function getEffectByNum(num) {
  return EFFECTS_CATALOG.find((e) => e.num === Number(num)) || null;
}

export function getInitials(name) {
  return String(name || "C")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "C";
}

export function doesUserMatchAuthor(user, profile, authorName) {
  const target = String(authorName || "").trim().toLowerCase();
  if (!target) return false;

  const candidates = [
    profile?.displayName,
    user?.displayName,
    KNOWN_AUTHOR_EMAILS[(user?.email || "").toLowerCase()],
  ]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());

  return candidates.some((c) => c === target);
}

export function buildContributorsLeaderboard(likesMap = {}) {
  const byAuthor = new Map();
  for (const effect of EFFECTS_CATALOG) {
    const key = effect.author;
    const entry = byAuthor.get(key) || {
      author: effect.author,
      effectsCount: 0,
      likesCount: 0,
    };
    entry.effectsCount += 1;
    entry.likesCount += Number(likesMap[effect.id] || 0);
    byAuthor.set(key, entry);
  }

  return Array.from(byAuthor.values()).sort(
    (a, b) =>
      b.effectsCount - a.effectsCount ||
      b.likesCount - a.likesCount ||
      a.author.localeCompare(b.author)
  );
}
