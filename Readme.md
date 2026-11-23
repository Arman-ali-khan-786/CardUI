<div align="center">

<img src="./assets/CARDUi.webp" alt="CardUI Showcase Banner" width="82%" />

# CardUI

**Interactive Card UI Design Showcase, Community Platform & Containerized DevSecOps Pipeline**

[![CI/CD Docker Pipeline](https://github.com/Arman-ali-khan-786/CardUI/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Arman-ali-khan-786/CardUI/actions/workflows/ci-cd.yml)
[![Deploy GitHub Pages](https://github.com/Arman-ali-khan-786/CardUI/actions/workflows/pages.yml/badge.svg)](https://github.com/Arman-ali-khan-786/CardUI/actions/workflows/pages.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22_Alpine-339933?logo=node.js&logoColor=white)](./Dockerfile)
[![License](https://img.shields.io/github/license/Arman-ali-khan-786/CardUI)](./LICENSE)

[Live Website](https://arman-ali-khan-786.github.io/CardUI/) · [Contribute](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md)

</div>

---

## Overview

**CardUI** is a curated showcase of **25+ interactive Card UI designs and CSS/JS effects** built for modern web interfaces, paired with community creator accounts, real-time likes, a contributor leaderboard, and a production-ready **Docker + GitHub Actions DevSecOps** delivery pipeline.

### Key Features

- **25 Interactive Card Effects**: Glassmorphism, 3D tilt, neon hover borders, profile reveals, animated overlays, and responsive layouts with category filtering, search, and light/dark theme switching.
- **Community Profiles & Leaderboard**: Firebase Authentication (Email/Password + Google OAuth) with verified creator attribution, customizable public profiles, and a live contributor leaderboard.
- **Atomic Real-Time Likes**: Batched Cloud Firestore transactions ensure accurate per-effect like counts without race conditions or client tampering.
- **Dual Delivery Targets**:
  - **Static Edge Hosting**: Automated GitHub Pages deployment for static assets.
  - **Containerized Runtime**: Hardened multi-stage Node.js 22 Alpine Express server published to GitHub Container Registry (`ghcr.io`).

---

## Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, CSS3 (`index.css`, `css/app-upgrade.css`), Vanilla ES Modules (`js/`) | Multi-page UI (`index.html`, `login.html`, `signup.html`, `profile.html`), catalog rendering, theme & interactive effects |
| **Auth & Database** | Firebase Auth + Cloud Firestore (`js/firebase-config.js`, `js/firebase-client.js`) | User sessions, verified identity claims, public/private profile split, real-time likes |
| **App Server** | Node.js 22 + Express 4 (`server.js`) | Production static serving, security headers, internal path blocking, `/healthz` probe |
| **Containerization** | 3-Stage Docker (`node:22-alpine`) | Minimal non-root image with build-time syntax verification and health checks |
| **Testing & Linting** | `node:test`, `node --check`, ESLint + `@firebase/eslint-plugin-security-rules` | Automated syntax validation, Firestore security rules linting, unit & HTTP security tests |
| **CI/CD** | GitHub Actions (`ci-cd.yml`, `pages.yml`) | Automated PR checks, GHCR commit-SHA container builds, smoke tests, and GitHub Pages deploys |

### Project Structure

```text
CardUI/
├── .github/
│   ├── CODEOWNERS                 # Enforces repository owner review on PRs
│   └── workflows/
│       ├── ci-cd.yml              # Lint -> Test -> Docker Build/Push (GHCR) -> Smoke Verify
│       └── pages.yml              # Path-filtered GitHub Pages static deployment
├── assets/                        # Optimized WebP/PNG/GIF/SVG media & favicon
├── css/
│   └── app-upgrade.css            # Upgraded theme system, navigation, modals, and layout styling
├── js/
│   ├── auth-nav.js                # Auth state header navigation & safe query parameter scrubbing
│   ├── effects-data.js            # Canonical 25-effect catalog, categories & leaderboard logic
│   ├── firebase-config.js         # Runtime Firebase config loader (env/injected, no hardcoded secrets)
│   ├── firebase-client.js         # Auth, token refresh, safe URL validation & profile helpers
│   ├── likes-service.js           # Atomic batched Firestore like counters
│   ├── index-page.js              # Catalog search, category tabs, preview & code modals
│   ├── login.js / signup.js       # Validated login/signup flows with allowlisted redirects
│   └── profile.js                 # Creator profile management & verification status
├── tests/
│   └── app.test.mjs               # Node test suite (catalog, attribution, assets & server security)
├── index.html / login.html / signup.html / profile.html
├── server.js                      # Hardened Express server with /healthz & internal file denylist
├── firestore.rules                # Strict schema, token-parity & PII-isolation rules
├── eslint.config.mjs              # Security rules ESLint configuration
├── Dockerfile                     # 3-stage non-root Alpine container build
├── .dockerignore                  # Excludes tests, CI configs, git history & local env files
└── package.json
```

---

## DevOps Best Practices

CardUI's delivery workflows are structured for fast feedback, minimal runner consumption, and immutable artifact traceability:

```text
  PR / Push (non-doc changes)
       │
       ▼
  [1. lint]  ──► ESLint (firestore.rules) + JS syntax verification (node --check)
       │
       ▼
  [2. test]  ──► Production deps install + `npm test` (catalog, asset integrity, live HTTP security tests)
       │
       ▼
  [3. build-and-push]
       ├── On PR:   Builds Docker image locally & runs live container smoke tests (/healthz, 200/404 routes)
       └── On Push: Pushes multi-stage image to GHCR tagged with full commit SHA, short SHA & `latest`
       │
       ├──► [pr-report]  Posts/updates PR status table + failure logs directly on the PR
       └──► [use-image]  Pulls exact commit-SHA image from GHCR and verifies live container endpoints
```

### Engineering & Cost-Optimization Highlights

- **3-Stage Multi-Stage `Dockerfile`**:
  1. `deps`: Installs production-only npm dependencies (`--omit=dev`) and cleans cache.
  2. `builder`: Syntax-checks all JavaScript entry points and stages only runtime files.
  3. `runtime`: Copies artifacts with `--chown=node:node` onto a clean `node:22-alpine` image, drops privileges to `USER node`, and defines a native `HEALTHCHECK` against `/healthz`.
- **Immutable Commit-SHA Registry Tagging**: Every push builds and tags `ghcr.io/<owner>/<repo>:<commit-sha>` alongside `sha-<short>` and `latest`, then verifies the exact commit image by pulling and testing it in `use-image`.
- **Linux-Only Efficient Runners**: All CI/CD and Pages jobs run exclusively on `ubuntu-latest` (no macOS/Windows runner overhead).
- **Smart Workflow Filtering & Draft Skipping**:
  - `ci-cd.yml` uses `paths-ignore` (`**/*.md`, `LICENSE`, `.gitignore`) so doc-only edits do not trigger builds, and skips Draft PRs until marked **Ready for review** (`ready_for_review`).
  - `pages.yml` uses a strict frontend `paths` filter so server, test, or Docker updates do not trigger redundant GitHub Pages deployments.
- **Duplicate Run Cancellation**: Both workflows configure `concurrency` with `cancel-in-progress: true` (grouped by PR number or branch ref) to abort superseded runs immediately.
- **Automated PR Governance**: Backed by `.github/CODEOWNERS` (`* @Arman-ali-khan-786`) and PR status reporting (`pr-report`) so failed lint/test/container logs surface directly in the PR conversation, while owner approval gates merges (with owner bypass support via GitHub Rulesets).

---

## DevSecOps & Sensitive Data Protection

Security controls are enforced across **source control**, **container packaging**, **HTTP runtime**, **database rules**, and **client DOM rendering**:

### Sensitive Data & Secret Hygiene
- **Zero Secrets Committed**: `.env`, `.env.local`, `.env.*`, private credentials, and internal operational logs are excluded via `.gitignore` and `.dockerignore`.
- **Runtime Config Separation**: Firebase public web configuration is loaded cleanly at runtime via `firebase-applet-config.json` (excluded from documentation/logs) without embedding private service account keys, server secrets, or admin credentials anywhere in the repository.
- **No Internal Files Exposed at Runtime**: `server.js` enforces a case-insensitive denylist and dotfile rejection (`/(^|\/)\./`, `dotfiles: 'deny'`), returning `404` for `/server.js`, `/package.json`, `/Dockerfile`, `/firestore.rules`, `/tests/*`, `/walkthrough.md`, and `/.git/*`.

### Application, Database & Pipeline Hardening
- **Firestore PII Isolation & Token Parity (`firestore.rules`)**:
  - Private user records (`/users/{uid}`) allow owner-only `get` and explicitly deny collection listing (`allow list: if false;`).
  - Public non-PII profiles live separately in `/publicProfiles/{uid}` with bounded queries (`limit(100)`).
  - Writes enforce Firebase Auth token parity (`email` and `emailVerified` must match `request.auth.token`) and force an ID token refresh (`getIdToken(true)`) before verification updates.
  - Like counters use `writeBatch` + `getAfter()` checks so counters can only increment/decrement by `±1` alongside the authenticated user's like record.
- **XSS, URL Scheme & Redirect Guards**:
  - `photoURL` values are restricted to empty or valid `http(s)://` URLs at both Firestore Rules (`^https?://.+`) and client validation (`isSafeHttpUrl()`), rejecting `javascript:` or `data:` payloads.
  - Dynamic UI strings use `textContent` / `escapeHtml()`, and post-login redirects validate against a strict page filename allowlist.
- **HTTP Response Security Headers (`server.js`)**: Disables `X-Powered-By` and sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Least-Privilege CI & Non-Root Containers**: GitHub Actions jobs scope permissions strictly to what each workflow needs (`contents: read`, `packages: write`, `pull-requests: write` for CI; `pages: write`, `id-token: write` for Pages), and containers execute as non-root `USER node`.

---

## Getting Started Locally

### Prerequisites
- **Node.js 22+** (or Docker)
- *(Optional)* A local `firebase-applet-config.json` for connecting to your own Firebase project (never commit private credentials or sensitive keys).

### 1. Run with Node.js

```bash
# Clone the repository
git clone https://github.com/Arman-ali-khan-786/CardUI.git
cd CardUI

# Install dependencies
npm install

# Run ESLint security rules & JS syntax checks
npm run lint

# Run automated unit, asset & server security tests
npm test

# Start the Express server on http://localhost:3000
npm start
```

Verify the health endpoint:
```bash
curl http://localhost:3000/healthz
# {"status":"ok"}
```

### 2. Run with Docker

```bash
# Build the multi-stage production image
docker build -t cardui:local .

# Run as non-root user on port 3000
docker run -d --name cardui -p 3000:3000 cardui:local

# Check container health
curl http://localhost:3000/healthz
```

Or pull a verified commit-SHA build published by CI:
```bash
docker pull ghcr.io/arman-ali-khan-786/cardui:<commit-sha>
docker run -d -p 3000:3000 --name cardui ghcr.io/arman-ali-khan-786/cardui:<commit-sha>
```

---

## Contributing

Contributions are always welcome! Before opening a pull request, please review [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md).

1. **Fork & Branch**: Create a dedicated feature branch (e.g., `git checkout -b feat/my-card-effect`).
2. **Add Your Effect**: Follow the project conventions in `index.html`, `css/app-upgrade.css` / `index.css`, and `js/effects-data.js`, placing any new media inside `assets/`.
3. **Verify Locally**: Ensure `npm run lint` and `npm test` pass with zero errors.
4. **Open a Pull Request**: Automated CI checks will lint, test, and smoke-test the Docker build on your PR and post feedback directly in the thread.

---

<div align="center">
Made with care by the <strong>CardUI</strong> community · Licensed under <a href="./LICENSE">LICENSE</a>
</div>
