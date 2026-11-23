# Security Summary

**Reviewed Files**: 14
**Issues Resolved**: 4

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Verification & Email Spoofing | `firestore.rules` | 49, 55 | Authenticated users could write an arbitrary `email` or set `emailVerified: true` in their `/users/{uid}` document even when unverified in Firebase Auth. | Medium | Fixed | Enforced token parity (`data.email.lower() == request.auth.token.email.lower()` and `data.emailVerified == (request.auth.token.email_verified == true)`), plus forced ID token refresh in `js/firebase-client.js` and `js/profile.js`. |
| Unvalidated Avatar URLs | `firestore.rules`, `js/firebase-client.js`, `js/auth-nav.js`, `js/profile.js`, `js/index-page.js` | 50, 88 | `photoURL` only checked string length (<= 2048), allowing non-HTTP URL schemes (such as `javascript:` or `data:`) to be stored or rendered in avatar tags. | Medium | Fixed | Restricted `photoURL` to empty or `http(s)://` in `firestore.rules` and added `isSafeHttpUrl()` validation before storage and DOM image rendering. |
| Case-Sensitive Static Blocking & Headers | `server.js` | 1, 10 | Express left `X-Powered-By` enabled, omitted standard hardening headers, and checked blocked internal filenames case-sensitively without blocking dotfiles/audit files. | Low | Fixed | Disabled `x-powered-by`, added `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers, normalized blocked paths to lowercase, and denied dot-prefixed paths. |
| Unbounded Directory Query | `js/firebase-client.js` | 313 | `listPublicProfiles()` queried all documents in `/publicProfiles` without a query limit. | Low | Fixed | Added `limit(100)` to `listPublicProfiles()` alongside the `displayName >= ""` filter enforced by `firestore.rules`. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| PII Isolation | `firestore.rules`, `firebase-blueprint.json` | Private data (`email`, `provider`, `emailVerified`) stays in `/users/{userId}` with owner-only `get` and `allow list: if false;`. Non-PII public views live separately in `/publicProfiles/{userId}`. |
| Atomic Like Counters | `firestore.rules`, `js/likes-service.js` | `/users/{userId}/likes/{effectId}` writes use `writeBatch` and `existsAfter`/`getAfter` checks so `/effects/{effectId}.likesCount` can only change by `±1` alongside the user's own like record. |
| Schema & Size Validation | `firestore.rules`, `js/firebase-config.js` | All writes enforce strict `keys().hasAll(...)` / `keys().hasOnly(...)`, regex ID guards, server timestamps (`request.time`), and explicit string/array bounds. |
| Safe Redirects & Output Encoding | `js/login.js`, `js/index-page.js`, `js/profile.js` | Post-login redirects use a strict filename allowlist (`profile.html` / `index.html`), and dynamic text uses `textContent` or `escapeHtml()`. |
| Dependency Security | `package.json`, `bun.lock` | `bun audit` checked all 159 installed packages and reported 0 known vulnerabilities. |

## PoC Verification

### 1. Verification & Email Spoofing on Private User Document

#### Summary
| Field | Value |
|---|---|
| Issue Type | Broken Authorization / Claim Spoofing |
| Impact | Medium |
| Affected File | `firestore.rules:49,55` |
| Test Scenario | Unverified authenticated user (`bob_uid_456`, `email_verified: false`, `email: bob@example.com`) attempts `setDoc('/users/bob_uid_456', { ..., emailVerified: true })` or `{ ..., email: 'alice@example.com' }`. |

#### How It Was Fixed
`isValidUserProfile` now compares incoming `email` and `emailVerified` fields directly against `request.auth.token.email` and `request.auth.token.email_verified`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Client submits `setDoc` / `updateDoc` on `/users/bob_uid_456` with `emailVerified: true` or mismatched `email`. | Request enters Firestore rules |
| 2 | `isValidUserProfile` at `firestore.rules:49,55` checks `data.email.lower() == request.auth.token.email.lower()` and `data.emailVerified == (request.auth.token.email_verified == true)`. | Predicate evaluates to `false` |
| 3 | Firestore rejects the write. | **Handled Safely (`PERMISSION_DENIED`)** |

#### Conclusion
**Fix Verified** - Users can no longer self-mark `emailVerified: true` or record another person's email in Firestore without a matching verified Firebase Auth token.

### 2. Unsafe `photoURL` Scheme Injection

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unsafe URL Handling |
| Impact | Medium |
| Affected File | `firestore.rules:50,88` & `js/firebase-client.js:175` |
| Test Scenario | Attacker submits `photoURL: "javascript:alert(1)"` to `/publicProfiles/bob_uid_456` or passes it into avatar rendering. |

#### How It Was Fixed
Added `^https?://.+` pattern enforcement in `firestore.rules` and `isSafeHttpUrl()` validation in client write/render helpers.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `javascript:alert(1)` enters Firestore write or client avatar renderer. | Input enters validator |
| 2 | `firestore.rules:88` fails `.matches('^https?://.+')`; client `isSafeHttpUrl()` at `js/firebase-client.js:175` parses `new URL(...)` and rejects non-HTTP(S) schemes returning `""`. | Write blocked / URL stripped |
| 3 | Avatar falls back safely to user initials (`getInitials`). | **Handled Safely** |

#### Conclusion
**Fix Verified** - Non-HTTP(S) URLs are rejected at both the database rules layer and browser DOM layer.

### 3. Case-Insensitive Internal File Blocking & Security Headers

#### Summary
| Field | Value |
|---|---|
| Issue Type | Sensitive File Exposure / Missing HTTP Hardening |
| Impact | Low |
| Affected File | `server.js:1-37` |
| Test Scenario | Request arrives for `/Package.json`, `/.git/config`, or `/walkthrough.md`. |

#### How It Was Fixed
Lowercased `req.path` before `BLOCKED_PATHS` lookup, blocked dot-prefixed path segments (`/(^|\/)\./`), added `dotfiles: 'deny'`, disabled `x-powered-by`, and attached standard response security headers.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Incoming HTTP request reaches Express middleware at `server.js:21`. | Middleware runs |
| 2 | Response sets `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`; path normalized to lowercase and checked against `BLOCKED_PATHS` and dotfile regex. | Blocked path matched |
| 3 | Server returns HTTP `404 Not found` without serving file contents. | **Handled Safely** |

#### Conclusion
**Fix Verified** - Internal configuration, rules, and dot-prefixed paths cannot be retrieved regardless of URL casing.
