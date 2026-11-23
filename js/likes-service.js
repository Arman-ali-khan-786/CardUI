import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  where,
  handleFirestoreError,
  syncPublicProfileLikes,
  OperationType,
} from "./firebase-client.js";
import { FIELD_LIMITS } from "./firebase-config.js";

/**
 * Fetch public aggregate like counts from /effects.
 * Returns a plain map { [effectId]: number }.
 */
export async function fetchEffectsLikes() {
  const path = "effects";
  try {
    const effectsQuery = query(collection(db, path), where("likesCount", ">=", 0));
    const snap = await getDocs(effectsQuery);
    const map = {};
    snap.forEach((d) => {
      const data = d.data();
      map[d.id] = typeof data?.likesCount === "number" ? data.likesCount : 0;
    });
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Subscribe in real time to /effects aggregate like counts.
 */
export function subscribeEffectsLikes(onUpdate, onError) {
  const path = "effects";
  const effectsQuery = query(collection(db, path), where("likesCount", ">=", 0));
  return onSnapshot(
    effectsQuery,
    (snap) => {
      const map = {};
      snap.forEach((d) => {
        const data = d.data();
        map[d.id] = typeof data?.likesCount === "number" ? data.likesCount : 0;
      });
      onUpdate(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (typeof onError === "function") onError(wrapped);
      }
    }
  );
}

/**
 * Fetch all effectIds liked by a specific user from /users/{uid}/likes.
 */
export async function fetchUserLikes(uid) {
  if (!uid || !FIELD_LIMITS.UID_PATTERN.test(uid)) {
    return new Set();
  }
  const path = `users/${uid}/likes`;
  try {
    const snap = await getDocs(collection(db, "users", uid, "likes"));
    const set = new Set();
    snap.forEach((d) => set.add(d.id));
    return set;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Subscribe in real time to /users/{uid}/likes for the signed-in user.
 */
export function subscribeUserLikes(uid, onUpdate, onError) {
  if (!uid || !FIELD_LIMITS.UID_PATTERN.test(uid)) {
    onUpdate(new Set());
    return () => {};
  }
  const path = `users/${uid}/likes`;
  return onSnapshot(
    collection(db, "users", uid, "likes"),
    (snap) => {
      const set = new Set();
      snap.forEach((d) => set.add(d.id));
      onUpdate(set);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (typeof onError === "function") onError(wrapped);
      }
    }
  );
}

/**
 * Atomically toggle a like for effectId on behalf of the signed-in user.
 * Pairs /users/{uid}/likes/{effectId} with /effects/{effectId}.likesCount.
 */
export async function toggleEffectLike(user, effectId, currentlyLiked) {
  if (!user || !FIELD_LIMITS.UID_PATTERN.test(user.uid)) {
    throw new Error("You must be signed in to like effects.");
  }
  if (!FIELD_LIMITS.EFFECT_ID_PATTERN.test(effectId)) {
    throw new Error("Invalid effect identifier.");
  }

  const userLikeRef = doc(db, "users", user.uid, "likes", effectId);
  const effectRef = doc(db, "effects", effectId);
  const batchPath = `users/${user.uid}/likes/${effectId}`;

  let effectSnap;
  try {
    effectSnap = await getDoc(effectRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `effects/${effectId}`);
  }

  const batch = writeBatch(db);

  if (currentlyLiked) {
    batch.delete(userLikeRef);
    if (effectSnap.exists()) {
      batch.update(effectRef, {
        likesCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }
  } else {
    batch.set(userLikeRef, {
      userId: user.uid,
      effectId,
      createdAt: serverTimestamp(),
    });
    if (effectSnap.exists()) {
      batch.update(effectRef, {
        likesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(effectRef, {
        effectId,
        likesCount: 1,
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, batchPath);
  }

  try {
    const latestLikes = await fetchUserLikes(user.uid);
    await syncPublicProfileLikes(user, Array.from(latestLikes));
  } catch (syncErr) {
    console.warn("Public profile likes sync deferred:", syncErr);
  }

  return !currentlyLiked;
}
