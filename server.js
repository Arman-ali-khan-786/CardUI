const express = require('express');
const path = require('path');

const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const BLOCKED_PATHS = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/bun.lock',
  '/eslint.config.mjs',
  '/firestore.rules',
  '/draft_firestore.rules',
  '/firestore.rules.test.ts',
  '/firebase-blueprint.json',
  '/security_spec.md',
  '/walkthrough.md',
]);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const normalizedPath = req.path.toLowerCase();
  if (
    BLOCKED_PATHS.has(normalizedPath) ||
    normalizedPath.startsWith('/node_modules') ||
    /(^|\/)\./.test(normalizedPath)
  ) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(path.join(__dirname), { dotfiles: 'deny' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`CardUI server listening on http://${HOST}:${PORT}`);
});
