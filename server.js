import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables into process.env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3333', 10);
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const CLOUD_SAVES_PATH = path.join(DATA_DIR, 'cloud_saves.json');

// Ensure data directory exists for cloud sync
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readCloudSaves() {
  try {
    if (fs.existsSync(CLOUD_SAVES_PATH)) {
      return JSON.parse(fs.readFileSync(CLOUD_SAVES_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('Error reading cloud saves:', err);
  }
  return {};
}

function writeCloudSaves(saves) {
  try {
    fs.writeFileSync(CLOUD_SAVES_PATH, JSON.stringify(saves, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error writing cloud saves:', err);
  }
}

function setEnvVar(envContent, key, val) {
  const escapedVal = val.trim();
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    return envContent.replace(regex, `${key}=${escapedVal}`);
  }
  return (envContent.trim() + `\n${key}=${escapedVal}`).trim();
}

function getBaseOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'solitaire.beechem.site';
  const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function renderOAuthSuccessPopup(authUser) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Successful</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 40px; background: #0b472a; color: white;">
  <div style="font-size: 44px; margin-bottom: 12px;">👑</div>
  <h2>Signed In as ${String(authUser.displayName || 'Player').replace(/</g, '&lt;')}!</h2>
  <p style="opacity: 0.85;">Syncing your MobilityWare Solitaire profile...</p>
  <script>
    const user = ${JSON.stringify(authUser)};
    try {
      localStorage.setItem('solitaire_auth_user', JSON.stringify(user));
    } catch (e) {}
    if (window.opener) {
      window.opener.postMessage({ type: 'SOLITAIRE_AUTH_SUCCESS', user: user }, '*');
      setTimeout(() => window.close(), 250);
    } else {
      window.location.href = '/';
    }
  </script>
</body>
</html>`;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // Security & CORS headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API Route: Check Auth Status
  if (pathname === '/api/auth/status') {
    const origin = getBaseOrigin(req);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      githubConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      callbackUrl: `${origin}/api/auth/github/callback`,
      googleCallbackUrl: `${origin}/api/auth/google/callback`
    }));
    return;
  }

  // 2. API Route: Save OAuth Credentials to .env
  if (pathname === '/api/auth/configure' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      const envPath = path.join(__dirname, '.env');
      let currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      if (data.githubClientId && data.githubClientSecret) {
        process.env.GITHUB_CLIENT_ID = String(data.githubClientId).trim();
        process.env.GITHUB_CLIENT_SECRET = String(data.githubClientSecret).trim();
        currentEnv = setEnvVar(currentEnv, 'GITHUB_CLIENT_ID', process.env.GITHUB_CLIENT_ID);
        currentEnv = setEnvVar(currentEnv, 'GITHUB_CLIENT_SECRET', process.env.GITHUB_CLIENT_SECRET);
      }

      if (data.googleClientId && data.googleClientSecret) {
        process.env.GOOGLE_CLIENT_ID = String(data.googleClientId).trim();
        process.env.GOOGLE_CLIENT_SECRET = String(data.googleClientSecret).trim();
        currentEnv = setEnvVar(currentEnv, 'GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID);
        currentEnv = setEnvVar(currentEnv, 'GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET);
      }

      fs.writeFileSync(envPath, currentEnv.trim() + '\n', 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        githubConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. API Route: Live GitHub Profile Lookup (works without OAuth Client Secret!)
  if (pathname === '/api/auth/github/profile' && req.method === 'GET') {
    const username = (parsedUrl.searchParams.get('username') || '').trim().replace(/^@/, '');
    if (!username) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Please provide a GitHub username.' }));
      return;
    }

    try {
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: {
          'User-Agent': 'MobilityWare-Solitaire-PWA',
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!ghRes.ok) {
        if (ghRes.status === 404) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: `GitHub user "${username}" not found.` }));
          return;
        }
        // Fallback if rate-limited
        const fallbackUser = {
          uid: `gh_${username.toLowerCase()}`,
          displayName: username,
          email: `${username}@users.noreply.github.com`,
          photoURL: `https://github.com/${encodeURIComponent(username)}.png`,
          provider: 'github'
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ user: fallbackUser }));
        return;
      }

      const ghUser = await ghRes.json();
      const authUser = {
        uid: `gh_${ghUser.id || ghUser.login.toLowerCase()}`,
        displayName: ghUser.name || ghUser.login,
        email: ghUser.email || `${ghUser.login}@users.noreply.github.com`,
        photoURL: ghUser.avatar_url || `https://github.com/${encodeURIComponent(ghUser.login)}.png`,
        provider: 'github'
      };

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ user: authUser }));
    } catch (err) {
      const fallbackUser = {
        uid: `gh_${username.toLowerCase()}`,
        displayName: username,
        email: `${username}@users.noreply.github.com`,
        photoURL: `https://github.com/${encodeURIComponent(username)}.png`,
        provider: 'github'
      };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ user: fallbackUser }));
    }
    return;
  }

  // 4. API Route: Google Account Profile Sign-In (works even when Google OAuth secret isn't set)
  if (pathname === '/api/auth/google/profile' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      let email = String(data.email || '').trim().toLowerCase();
      let name = String(data.name || '').trim();

      if (!email || !email.includes('@')) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Please enter a valid Google email address.' }));
        return;
      }

      if (!name) {
        const localPart = email.split('@')[0];
        name = localPart
          .split(/[._-]/)
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      const hash = crypto.createHash('md5').update(email).digest('hex');
      const authUser = {
        uid: `google_${hash.slice(0, 16)}`,
        displayName: name || email.split('@')[0],
        email,
        photoURL: `https://www.gravatar.com/avatar/${hash}?d=identicon&s=128`,
        provider: 'google'
      };

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ user: authUser }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. API Route: Direct GitHub OAuth Redirection
  if (pathname === '/api/auth/github') {
    const usernameParam = parsedUrl.searchParams.get('username');
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      // Render interactive GitHub Sign-In popup when OAuth app credentials aren't set
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in with GitHub - Solitaire</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #f0f6fc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 14px; max-width: 380px; width: 100%; padding: 28px 24px; box-shadow: 0 16px 32px rgba(0,0,0,0.5); text-align: center; }
    svg { width: 48px; height: 48px; fill: #f0f6fc; margin-bottom: 12px; }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    p { margin: 0 0 20px; font-size: 13px; color: #8b949e; line-height: 1.45; }
    label { display: block; text-align: left; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #c9d1d9; }
    input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: #f0f6fc; font-size: 14px; box-sizing: border-box; margin-bottom: 14px; outline: none; }
    input:focus { border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88,166,255,0.2); }
    button { width: 100%; padding: 11px; border-radius: 8px; border: 1px solid rgba(240,246,252,0.1); background: #238636; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
    button:hover { background: #2ea043; }
    .err { color: #f85149; font-size: 12px; margin-bottom: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <svg viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
    <h2>Sign in with GitHub</h2>
    <p>Enter your GitHub username to link your GitHub profile and sync your Solitaire stats & crowns.</p>
    <div id="err" class="err"></div>
    <form id="f">
      <label for="u">GitHub Username</label>
      <input id="u" type="text" placeholder="e.g. KhanTheDaleK1" value="${(usernameParam || 'KhanTheDaleK1').replace(/"/g, '&quot;')}" required autofocus />
      <button id="btn" type="submit">Continue as GitHub User</button>
    </form>
  </div>
  <script>
    const form = document.getElementById('f');
    const errEl = document.getElementById('err');
    const btn = document.getElementById('btn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      const u = document.getElementById('u').value.trim();
      if (!u) return;
      btn.textContent = 'Connecting to GitHub...';
      btn.disabled = true;
      try {
        const res = await fetch('/api/auth/github/profile?username=' + encodeURIComponent(u));
        const data = await res.json();
        if (!res.ok || !data.user) throw new Error(data.error || 'Could not fetch GitHub profile');
        localStorage.setItem('solitaire_auth_user', JSON.stringify(data.user));
        if (window.opener) {
          window.opener.postMessage({ type: 'SOLITAIRE_AUTH_SUCCESS', user: data.user }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Continue as GitHub User';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
      return;
    }

    const origin = getBaseOrigin(req);
    const redirectUri = `${origin}/api/auth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
    res.writeHead(302, { Location: githubAuthUrl });
    res.end();
    return;
  }

  // 6. API Route: GitHub OAuth Callback
  if (pathname === '/api/auth/github/callback') {
    const code = parsedUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Missing code parameter from GitHub.</h2>');
      return;
    }

    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token with GitHub');
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'Solitaire-PWA'
        }
      });

      const ghUser = await userRes.json();
      const authUser = {
        uid: `gh_${ghUser.id}`,
        displayName: ghUser.name || ghUser.login,
        email: ghUser.email || `${ghUser.login}@users.noreply.github.com`,
        photoURL: ghUser.avatar_url || '',
        provider: 'github'
      };

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderOAuthSuccessPopup(authUser));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>GitHub Authentication Failed</h2><p>${err.message}</p>`);
    }
    return;
  }

  // 7. API Route: Direct Google OAuth Redirection
  if (pathname === '/api/auth/google') {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      // Render interactive Google Sign-In popup when OAuth app credentials aren't set
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in with Google - Solitaire</title>
  <style>
    body { font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, sans-serif; background: #f8f9fa; color: #202124; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #ffffff; border: 1px solid #dadce0; border-radius: 12px; max-width: 380px; width: 100%; padding: 32px 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); text-align: center; }
    svg { width: 40px; height: 40px; margin-bottom: 12px; }
    h2 { margin: 0 0 6px; font-size: 22px; font-weight: 500; }
    p { margin: 0 0 22px; font-size: 14px; color: #5f6368; line-height: 1.4; }
    label { display: block; text-align: left; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #3c4043; }
    input { width: 100%; padding: 11px 12px; border-radius: 6px; border: 1px solid #dadce0; background: #fff; color: #202124; font-size: 14px; box-sizing: border-box; margin-bottom: 14px; outline: none; }
    input:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.2); }
    button { width: 100%; padding: 11px; border-radius: 6px; border: none; background: #1a73e8; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 4px; }
    button:hover { background: #1557b0; }
    .err { color: #d93025; font-size: 12px; margin-bottom: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <svg viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
    <h2>Sign in with Google</h2>
    <p>Continue to MobilityWare Solitaire Cloud Sync</p>
    <div id="err" class="err"></div>
    <form id="f">
      <label for="email">Google Email</label>
      <input id="email" type="email" placeholder="evan.t.beechem@gmail.com" value="evan.t.beechem@gmail.com" required autofocus />
      <label for="name">Display Name</label>
      <input id="name" type="text" placeholder="Evan Beechem" value="Evan Beechem" />
      <button id="btn" type="submit">Continue with Google</button>
    </form>
  </div>
  <script>
    const form = document.getElementById('f');
    const errEl = document.getElementById('err');
    const btn = document.getElementById('btn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      const email = document.getElementById('email').value.trim();
      const name = document.getElementById('name').value.trim();
      if (!email) return;
      btn.textContent = 'Signing in...';
      btn.disabled = true;
      try {
        const res = await fetch('/api/auth/google/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name })
        });
        const data = await res.json();
        if (!res.ok || !data.user) throw new Error(data.error || 'Google Sign-In failed');
        localStorage.setItem('solitaire_auth_user', JSON.stringify(data.user));
        if (window.opener) {
          window.opener.postMessage({ type: 'SOLITAIRE_AUTH_SUCCESS', user: data.user }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Continue with Google';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
      return;
    }

    const origin = getBaseOrigin(req);
    const redirectUri = `${origin}/api/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&access_type=online&prompt=select_account`;
    res.writeHead(302, { Location: googleAuthUrl });
    res.end();
    return;
  }

  // 8. API Route: Google OAuth Callback
  if (pathname === '/api/auth/google/callback') {
    const code = parsedUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Missing code parameter from Google.</h2>');
      return;
    }

    try {
      const origin = getBaseOrigin(req);
      const redirectUri = `${origin}/api/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token with Google');
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });

      const gUser = await userRes.json();
      const authUser = {
        uid: `google_${gUser.id}`,
        displayName: gUser.name || gUser.email?.split('@')[0] || 'Google Player',
        email: gUser.email || '',
        photoURL: gUser.picture || '',
        provider: 'google'
      };

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderOAuthSuccessPopup(authUser));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>Google Authentication Failed</h2><p>${err.message}</p>`);
    }
    return;
  }

  // 9. API Route: Cloud Stats Synchronization
  if (pathname === '/api/cloud/sync') {
    if (req.method === 'GET') {
      const uid = parsedUrl.searchParams.get('uid');
      if (!uid) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Missing uid' }));
        return;
      }
      const saves = readCloudSaves();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ stats: saves[uid] || null }));
      return;
    }

    if (req.method === 'POST') {
      try {
        const data = await readJsonBody(req);
        if (!data.uid || !data.stats) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Missing uid or stats' }));
          return;
        }
        const saves = readCloudSaves();
        saves[data.uid] = {
          ...data.stats,
          updatedAt: new Date().toISOString(),
          user: data.user || null
        };
        writeCloudSaves(saves);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, stats: saves[data.uid] }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // Static File Serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(DIST_DIR, pathname);

  // Security: prevent path traversal outside dist
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists, otherwise fallback to index.html (SPA)
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Caching headers
    if (ext === '.html' || ext === '.webmanifest' || pathname === '/sw.js') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Server Error');
    });
    res.writeHead(200);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Solitaire PWA server running on http://127.0.0.1:${PORT}`);
});
