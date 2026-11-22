# Firestore Security Specification (`cardui-slice`)

## 1. Data Invariants
1. **Strict Ownership (`/users/{userId}`)**: A document at `/users/{userId}` can only be read (`get`) or written (`create`, `update`) when `request.auth != null && request.auth.uid == userId`.
2. **No Collection Scraping (`list` denied on `/users`)**: Listing `/users` is strictly denied (`allow list: if false;`) to prevent PII (`email`) enumeration across users.
3. **UID & Path Integrity**: `userId` must match `^[a-zA-Z0-9_\-]+$` (1–128 chars), and `request.resource.data.uid` must equal `userId` on both create and update.
4. **Immortal & Immutable Fields**: `uid`, `provider`, and `createdAt` on `/users/{userId}`, and `effectId` on `/effects/{effectId}`, cannot be modified after document creation.
5. **Temporal Integrity**: `createdAt` (on create) and `updatedAt` (on create and update) must strictly equal `request.time`.
6. **Strict Schema & Size Boundaries**: Only allowlisted keys are permitted across `/users`, `/users/{userId}/likes`, and `/effects`; all strings enforce explicit `min`/`max` lengths and regex patterns.
7. **No Client-Controlled RBAC**: No `role` or `isAdmin` fields exist or are accepted on `/users/{userId}`.
8. **Atomic Like Synchronization (`existsAfter` / `getAfter`)**: Creating `/users/{userId}/likes/{effectId}` must atomically create or increment `/effects/{effectId}.likesCount` by exactly `+1` in the same batch; deleting `/users/{userId}/likes/{effectId}` must atomically decrement `/effects/{effectId}.likesCount` by exactly `-1`. Unpaired updates to `/effects/{effectId}` or jumps greater than `±1` are strictly denied.
9. **Private Favourites Subcollection**: Only the owner (`request.auth.uid == userId`) can `get`, `list`, `create`, or `delete` their own `/users/{userId}/likes/{effectId}` documents.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Read**: Anonymous client attempts `get(/users/aliceUid)` or `list(/users/aliceUid/likes)`.
2. **Cross-User Read**: Authenticated `bobUid` attempts `get(/users/aliceUid)` or `list(/users/aliceUid/likes)`.
3. **Collection Enumeration (List)**: Authenticated `bobUid` attempts `list(/users)`.
4. **UID Spoofing on Create**: `bobUid` creates `/users/bobUid` with `{ "uid": "aliceUid", ... }`, or creates `/users/bobUid/likes/ui-1` with `{ "userId": "aliceUid", ... }`.
5. **Cross-User Create**: `bobUid` attempts to create `/users/aliceUid` or `/users/aliceUid/likes/ui-1`.
6. **Shadow / Ghost Field Injection**: `aliceUid` creates/updates `/users/aliceUid` with extra `{ "isAdmin": true }` or `/effects/ui-1` with `{ "featured": true }`.
7. **Missing Required Field**: `aliceUid` creates `/users/aliceUid` omitting `email` or `provider`.
8. **Invalid Provider Enum / Effect ID**: `aliceUid` creates `/users/aliceUid` with `{ "provider": "anonymous" }` or `/effects/ui-999`.
9. **Oversized String ("Denial of Wallet")**: `aliceUid` updates `/users/aliceUid` with `displayName` > 100 chars or `bio` > 300 chars or `photoURL` > 2048 chars.
10. **Client-Spoofed Timestamp**: `aliceUid` creates `/users/aliceUid` or `/users/aliceUid/likes/ui-1` with a hardcoded past/future timestamp instead of `request.time`.
11. **Unpaired / Inflated Like Count Mutation**: `aliceUid` writes directly to `/effects/ui-1` setting `likesCount: 999` or incrementing without writing `/users/aliceUid/likes/ui-1` in the same batch.
12. **Unauthorized Delete / Unknown Collection**: `aliceUid` attempts `delete(/users/aliceUid)`, `delete(/effects/ui-1)`, or writes to `/admin/config`.
