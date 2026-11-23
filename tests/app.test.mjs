import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  EFFECTS_CATALOG,
  EFFECT_CATEGORIES,
  getEffectById,
  getEffectByNum,
  doesUserMatchAuthor,
  buildContributorsLeaderboard,
} from '../js/effects-data.js';

const ROOT_DIR = process.cwd();

test('effects catalog contains all 25 unique canonical effects and categories', () => {
  assert.equal(EFFECTS_CATALOG.length, 25);
  const ids = new Set(EFFECTS_CATALOG.map((e) => e.id));
  assert.equal(ids.size, 25);

  for (let i = 1; i <= 25; i += 1) {
    const byId = getEffectById(`ui-${i}`);
    const byNum = getEffectByNum(i);
    assert.ok(byId, `Missing effect ui-${i}`);
    assert.equal(byId.id, byNum.id);
    assert.ok(byId.name.length > 0);
    assert.ok(byId.author.length > 0);
  }

  assert.ok(EFFECT_CATEGORIES.some((c) => c.id === 'all'));
});

test('author attribution relies strictly on verified email rather than displayName', () => {
  const verifiedOwner = {
    email: 'alikhanarman786@gmail.com',
    emailVerified: true,
    displayName: 'Arman',
  };
  const impersonatorSameName = {
    email: 'someone.else@example.com',
    emailVerified: true,
    displayName: 'Arman Ali Khan',
  };
  const unverifiedOwnerEmail = {
    email: 'alikhanarman786@gmail.com',
    emailVerified: false,
    displayName: 'Arman Ali Khan',
  };

  assert.equal(doesUserMatchAuthor(verifiedOwner, null, 'Arman Ali Khan'), true);
  assert.equal(doesUserMatchAuthor(impersonatorSameName, null, 'Arman Ali Khan'), false);
  assert.equal(doesUserMatchAuthor(unverifiedOwnerEmail, null, 'Arman Ali Khan'), false);
});

test('contributors leaderboard aggregates counts and likes accurately', () => {
  const board = buildContributorsLeaderboard({ 'ui-1': 5, 'ui-2': 3 });
  const arman = board.find((b) => b.author === 'Arman Ali Khan');
  assert.ok(arman);
  assert.equal(arman.effectsCount, 2);
  assert.equal(arman.likesCount, 8);
});

test('HTML entry points include favicon and valid local assets', () => {
  const htmlFiles = ['index.html', 'login.html', 'signup.html', 'profile.html'];
  for (const file of htmlFiles) {
    const fullPath = path.join(ROOT_DIR, file);
    assert.ok(fs.existsSync(fullPath), `${file} missing`);
    const html = fs.readFileSync(fullPath, 'utf8');
    assert.match(html, /assets\/favicon\.svg/, `${file} should link favicon.svg`);

    const assetMatches = html.match(/assets\/[A-Za-z0-9_.\-()% ]+\.(?:png|jpg|jpeg|webp|gif|svg)/gi) || [];
    for (const ref of assetMatches) {
      const assetPath = path.join(ROOT_DIR, decodeURIComponent(ref));
      assert.ok(fs.existsSync(assetPath), `Missing asset ${ref} referenced in ${file}`);
    }
  }
});

test('Express server serves app, healthcheck, security headers, and blocks internal files', async (t) => {
  const testPort = 4321;
  const baseUrl = `http://127.0.0.1:${testPort}`;
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(testPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(() => {
    if (!proc.killed) {
      proc.kill('SIGTERM');
    }
  });

  // Wait until /healthz responds
  let ready = false;
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/healthz`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert.ok(ready, 'Server did not become healthy in time');

  const healthRes = await fetch(`${baseUrl}/healthz`);
  assert.equal(healthRes.status, 200);
  assert.deepEqual(await healthRes.json(), { status: 'ok' });

  const homeRes = await fetch(`${baseUrl}/`);
  assert.equal(homeRes.status, 200);
  assert.equal(homeRes.headers.get('x-powered-by'), null);
  assert.equal(homeRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(homeRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');

  const favRes = await fetch(`${baseUrl}/favicon.ico`);
  assert.equal(favRes.status, 200);

  for (const blocked of ['/server.js', '/package.json', '/Package.json', '/firestore.rules', '/Dockerfile', '/tests/app.test.mjs', '/.git/config']) {
    const res = await fetch(`${baseUrl}${blocked}`);
    assert.equal(res.status, 404, `Expected 404 for ${blocked}, got ${res.status}`);
  }
});
