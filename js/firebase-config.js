// Public Firebase Web App configuration for existing project: cardui-slice
// Safe for client-side hosting on GitHub Pages (contains only public client identifiers).
export const firebaseConfig = {
  apiKey: "AIzaSyBgN_6AkLkLC2_O-D9wpYViYgKrdtfX7ak",
  authDomain: "cardui-slice.firebaseapp.com",
  projectId: "cardui-slice",
  storageBucket: "cardui-slice.firebasestorage.app",
  messagingSenderId: "821485345383",
  appId: "1:821485345383:web:93e6a9ee1ae3e2d89dd2c2",
  measurementId: "G-N9Y5Y1DMKB"
};

// Validation limits synchronized with firebase-blueprint.json & firestore.rules
export const FIELD_LIMITS = {
  UID_MAX: 128,
  UID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  EFFECT_ID_MIN: 4,
  EFFECT_ID_MAX: 16,
  EFFECT_ID_PATTERN: /^ui-([1-9]|1[0-9]|2[0-5])$/,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 100,
  EMAIL_MIN: 3,
  EMAIL_MAX: 254,
  PHOTO_URL_MAX: 2048,
  BIO_MAX: 300,
};
