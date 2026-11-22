import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  reload,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig as fallbackFirebaseConfig, FIELD_LIMITS } from "./firebase-config.js";

async function loadFirebaseConfig() {
  try {
    const res = await fetch("./firebase-applet-config.json", { cache: "no-store" });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const appletConfig = await res.json();
      if (appletConfig && appletConfig.projectId && appletConfig.projectId !== "remixed-project-id") {
        return appletConfig;
      }
    }
  } catch {
    // Fallback to static firebase-config.js when no applet config file exists
  }
  return fallbackFirebaseConfig;
}

const resolvedFirebaseConfig = await loadFirebaseConfig();
const app = initializeApp(resolvedFirebaseConfig);
export const auth = getAuth(app);
export const db = resolvedFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Ensure persistent local auth session across browser reloads
export const persistenceReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Firebase persistence warning:", err);
});

// Connection validation check on startup
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error(`Please check your Firebase configuration for project ${resolvedFirebaseConfig.projectId}.`);
    }
  }
}
testConnection();

export const OperationType = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
});

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function mapAuthError(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment before trying again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing.";
    case "auth/cancelled-popup-request":
      return "Sign-in request was superseded. Please try again.";
    case "auth/popup-blocked":
      return "Popup was blocked by your browser. Please allow popups for this site and try again.";
    case "auth/unauthorized-domain":
      return `This domain (${window.location.hostname}) is not yet authorized in Firebase Console → Authentication → Settings → Authorized domains.`;
    case "auth/operation-not-allowed":
      return `This sign-in provider is not enabled yet in Firebase Console (${resolvedFirebaseConfig.projectId} → Authentication → Sign-in method).`;
    case "auth/network-request-failed":
      return "Network error while contacting Firebase. Check your internet connection and retry.";
    case "auth/requires-recent-login":
      return "For security, please log out and sign back in before retrying this change.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
}

export function mapFirestoreUserError(error) {
  let rawMessage = error?.message || "";
  try {
    const parsed = JSON.parse(rawMessage || "{}");
    if (parsed.error) rawMessage = parsed.error;
  } catch {
    // Non-JSON error
  }

  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("does not exist") ||
    lower.includes("not_found") ||
    lower.includes("not found") ||
    lower.includes("has not been used in project") ||
    lower.includes("the client is offline")
  ) {
    return `Cloud Firestore database is not ready yet for project ${resolvedFirebaseConfig.projectId}.`;
  }
  if (lower.includes("permission")) {
    return `Permission denied by Firestore security rules for project ${resolvedFirebaseConfig.projectId}. Ensure the latest firestore.rules are deployed.`;
  }
  return rawMessage || "Unable to sync data with Cloud Firestore.";
}

function sanitizeString(value, maxLen) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export function validateProfileInput({ displayName, photoURL, bio }) {
  const cleanName = sanitizeString(displayName, FIELD_LIMITS.DISPLAY_NAME_MAX);
  if (cleanName.length < FIELD_LIMITS.DISPLAY_NAME_MIN) {
    throw new Error("Display name is required.");
  }

  const cleanPhoto = sanitizeString(photoURL, FIELD_LIMITS.PHOTO_URL_MAX);
  if (cleanPhoto) {
    try {
      const parsed = new URL(cleanPhoto);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Profile photo URL must start with https:// or http://.");
      }
    } catch (e) {
      if (e.message.includes("https://")) throw e;
      throw new Error("Please enter a valid profile photo URL.");
    }
  }

  const cleanBio = sanitizeString(bio, FIELD_LIMITS.BIO_MAX);
  return {
    displayName: cleanName,
    photoURL: cleanPhoto,
    bio: cleanBio,
  };
}

function resolveProvider(user) {
  const hasGoogle = user.providerData?.some((p) => p.providerId === "google.com");
  return hasGoogle ? "google" : "password";
}

function deriveDisplayName(user, fallbackName = "") {
  const raw =
    fallbackName ||
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "CardUI User");
  const clean = sanitizeString(raw, FIELD_LIMITS.DISPLAY_NAME_MAX);
  return clean.length >= 1 ? clean : "CardUI User";
}

export async function syncUserProfile(user, overrideDisplayName = "") {
  if (!user || !FIELD_LIMITS.UID_PATTERN.test(user.uid)) {
    throw new Error("Invalid authenticated user identifier.");
  }

  const path = `users/${user.uid}`;
  const userRef = doc(db, "users", user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap.exists()) {
    const newProfile = {
      uid: user.uid,
      displayName: deriveDisplayName(user, overrideDisplayName),
      email: sanitizeString(user.email, FIELD_LIMITS.EMAIL_MAX),
      photoURL: sanitizeString(user.photoURL, FIELD_LIMITS.PHOTO_URL_MAX),
      bio: "",
      provider: resolveProvider(user),
      emailVerified: Boolean(user.emailVerified),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    try {
      const createdSnap = await getDoc(userRef);
      return createdSnap.exists() ? createdSnap.data() : newProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  const existingData = existingSnap.data();
  const updates = {};
  const currentEmail = sanitizeString(user.email, FIELD_LIMITS.EMAIL_MAX);

  if (existingData.emailVerified !== Boolean(user.emailVerified)) {
    updates.emailVerified = Boolean(user.emailVerified);
  }
  if (currentEmail && existingData.email !== currentEmail) {
    updates.email = currentEmail;
  }
  if (!existingData.photoURL && user.photoURL) {
    updates.photoURL = sanitizeString(user.photoURL, FIELD_LIMITS.PHOTO_URL_MAX);
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp();
    try {
      await updateDoc(userRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return { ...existingData, ...updates };
  }

  return existingData;
}

export async function getUserProfile(uid) {
  if (!uid || !FIELD_LIMITS.UID_PATTERN.test(uid)) {
    throw new Error("Invalid user ID.");
  }
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfileDoc(user, input) {
  const existingProfile = await getUserProfile(user.uid).catch(() => null);
  const resolvedPhotoURL =
    input.photoURL !== undefined
      ? input.photoURL
      : existingProfile?.photoURL || user.photoURL || "";

  const { displayName, photoURL, bio } = validateProfileInput({
    displayName: input.displayName,
    photoURL: resolvedPhotoURL,
    bio: input.bio,
  });
  const path = `users/${user.uid}`;

  await updateProfile(user, {
    displayName,
    photoURL: photoURL || null,
  });

  const payload = {
    displayName,
    email: sanitizeString(user.email, FIELD_LIMITS.EMAIL_MAX),
    photoURL,
    bio,
    emailVerified: Boolean(user.emailVerified),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, "users", user.uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return getUserProfile(user.uid);
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  where,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  reload,
};
