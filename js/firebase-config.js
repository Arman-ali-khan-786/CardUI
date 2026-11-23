// Public Firebase Web App configuration for provisioned project: project-b4f18e87-e396-428d-9ef
// Safe for client-side hosting on GitHub Pages (contains only public client identifiers).
export const firebaseConfig = {
  apiKey: "AIzaSyB09vo5i8J6atzyfdZCwLhk0Gzcc1U-rro",
  authDomain: "project-b4f18e87-e396-428d-9ef.firebaseapp.com",
  projectId: "project-b4f18e87-e396-428d-9ef",
  firestoreDatabaseId: "ai-studio-cardui-7db929a7-1eed-4d32-a4eb-a474eb41c1d1",
  storageBucket: "project-b4f18e87-e396-428d-9ef.firebasestorage.app",
  messagingSenderId: "285153644280",
  appId: "1:285153644280:web:aa776189c2ea3e3948750d"
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
