/**
 * Firestore Security Rules Test Suite for CardUI
 * Covers /users/{userId}, /users/{userId}/likes/{effectId}, and /effects/{effectId}.
 * Verifies the "Dirty Dozen" adversarial payloads and authorized atomic like/unlike flows.
 */
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  query,
  writeBatch,
} from 'firebase/firestore';

const PROJECT_ID = 'cardui-slice';

async function run() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    const aliceCtx = testEnv.authenticatedContext('alice_uid_123', { email: 'alice@example.com', email_verified: true });
    const bobCtx = testEnv.authenticatedContext('bob_uid_456', { email: 'bob@example.com', email_verified: false });
    const anonCtx = testEnv.unauthenticatedContext();

    const validAliceProfile = {
      uid: 'alice_uid_123',
      displayName: 'Alice Developer',
      email: 'alice@example.com',
      photoURL: 'https://example.com/alice.png',
      bio: 'UI enthusiast',
      provider: 'google',
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Valid profile create, read, update by owner
    await assertSucceeds(setDoc(doc(aliceCtx.firestore(), 'users', 'alice_uid_123'), validAliceProfile));
    await assertSucceeds(getDoc(doc(aliceCtx.firestore(), 'users', 'alice_uid_123')));
    await assertSucceeds(
      updateDoc(doc(aliceCtx.firestore(), 'users', 'alice_uid_123'), {
        displayName: 'Alice Updated',
        bio: 'Updated bio',
        updatedAt: serverTimestamp(),
      })
    );

    // Valid atomic like (create effect counter + user like)
    const aliceLikeBatch = writeBatch(aliceCtx.firestore());
    aliceLikeBatch.set(doc(aliceCtx.firestore(), 'users', 'alice_uid_123', 'likes', 'ui-1'), {
      userId: 'alice_uid_123',
      effectId: 'ui-1',
      createdAt: serverTimestamp(),
    });
    aliceLikeBatch.set(doc(aliceCtx.firestore(), 'effects', 'ui-1'), {
      effectId: 'ui-1',
      likesCount: 1,
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(aliceLikeBatch.commit());

    // Public read of /effects and owner read of likes
    await assertSucceeds(getDocs(query(collection(anonCtx.firestore(), 'effects'), where('likesCount', '>=', 0))));
    await assertSucceeds(getDocs(collection(aliceCtx.firestore(), 'users', 'alice_uid_123', 'likes')));

    // Valid atomic second like by Bob
    const bobLikeBatch = writeBatch(bobCtx.firestore());
    bobLikeBatch.set(doc(bobCtx.firestore(), 'users', 'bob_uid_456', 'likes', 'ui-1'), {
      userId: 'bob_uid_456',
      effectId: 'ui-1',
      createdAt: serverTimestamp(),
    });
    bobLikeBatch.update(doc(bobCtx.firestore(), 'effects', 'ui-1'), {
      likesCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(bobLikeBatch.commit());

    // Valid atomic unlike by Alice
    const aliceUnlikeBatch = writeBatch(aliceCtx.firestore());
    aliceUnlikeBatch.delete(doc(aliceCtx.firestore(), 'users', 'alice_uid_123', 'likes', 'ui-1'));
    aliceUnlikeBatch.update(doc(aliceCtx.firestore(), 'effects', 'ui-1'), {
      likesCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(aliceUnlikeBatch.commit());

    // 1. Unauthenticated read of /users or /users/{uid}/likes
    await assertFails(getDoc(doc(anonCtx.firestore(), 'users', 'alice_uid_123')));
    await assertFails(getDocs(collection(anonCtx.firestore(), 'users', 'alice_uid_123', 'likes')));
    // 2. Cross-user read
    await assertFails(getDoc(doc(bobCtx.firestore(), 'users', 'alice_uid_123')));
    await assertFails(getDocs(collection(bobCtx.firestore(), 'users', 'alice_uid_123', 'likes')));
    // 3. Collection enumeration (list /users)
    await assertFails(getDocs(collection(bobCtx.firestore(), 'users')));
    // 4. UID spoofing on create
    await assertFails(
      setDoc(doc(bobCtx.firestore(), 'users', 'bob_uid_456'), {
        ...validAliceProfile,
        uid: 'alice_uid_123',
      })
    );
    // 5. Cross-user create
    await assertFails(setDoc(doc(bobCtx.firestore(), 'users', 'alice_uid_123'), validAliceProfile));
    // 6. Shadow / Ghost field injection
    await assertFails(
      setDoc(doc(bobCtx.firestore(), 'users', 'bob_uid_456'), {
        ...validAliceProfile,
        uid: 'bob_uid_456',
        isAdmin: true,
      })
    );
    // 7. Missing required field
    await assertFails(
      setDoc(doc(bobCtx.firestore(), 'users', 'bob_uid_456'), {
        uid: 'bob_uid_456',
        displayName: 'Bob',
        provider: 'password',
        emailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    // 8. Invalid provider enum & invalid effect ID
    await assertFails(
      setDoc(doc(bobCtx.firestore(), 'users', 'bob_uid_456'), {
        ...validAliceProfile,
        uid: 'bob_uid_456',
        provider: 'anonymous',
      })
    );
    await assertFails(
      setDoc(doc(bobCtx.firestore(), 'effects', 'ui-999'), {
        effectId: 'ui-999',
        likesCount: 1,
        updatedAt: serverTimestamp(),
      })
    );
    // 9. Oversized string ("Denial of Wallet")
    await assertFails(
      updateDoc(doc(aliceCtx.firestore(), 'users', 'alice_uid_123'), {
        displayName: 'A'.repeat(101),
        updatedAt: serverTimestamp(),
      })
    );
    // 10. Client-spoofed timestamp
    await assertFails(
      setDoc(doc(bobCtx.firestore(), 'users', 'bob_uid_456'), {
        ...validAliceProfile,
        uid: 'bob_uid_456',
        createdAt: Timestamp.fromMillis(1000),
        updatedAt: serverTimestamp(),
      })
    );
    // 11. Unpaired or inflated like counter write
    await assertFails(
      updateDoc(doc(aliceCtx.firestore(), 'effects', 'ui-1'), {
        likesCount: 999,
        updatedAt: serverTimestamp(),
      })
    );
    // 12. Unauthorized delete & unknown collection write
    await assertFails(deleteDoc(doc(aliceCtx.firestore(), 'users', 'alice_uid_123')));
    await assertFails(deleteDoc(doc(aliceCtx.firestore(), 'effects', 'ui-1')));
    await assertFails(setDoc(doc(aliceCtx.firestore(), 'admin', 'config'), { hacked: true }));

    console.log('All Dirty Dozen & atomic like security rule assertions passed!');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
