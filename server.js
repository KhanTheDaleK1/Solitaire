import http from 'http';
import fs from 'fs';
import path from 'path';
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
  // CORS & Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. API Route: Check Auth Status
  if (pathname === '/api/auth/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'solitaire.beechem.site';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    res.end(JSON.stringify({
      githubConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      callbackUrl: `${proto}://${host}/api/auth/github/callback`
    }));
    return;
  }

  // 2. API Route: Save Credentials to .env
  if (pathname === '/api/auth/configure' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const envPath = path.join(__dirname, '.env');
        let currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        if (data.githubClientId && data.githubClientSecret) {
          process.env.GITHUB_CLIENT_ID = data.githubClientId.trim();
          process.env.GITHUB_CLIENT_SECRET = data.githubClientSecret.trim();

          if (currentEnv.includes('GITHUB_CLIENT_ID=')) {
            currentEnv = currentEnv.replace(/GITHUB_CLIENT_ID=.*/g, `GITHUB_CLIENT_ID=${data.githubClientId.trim()}`);
          } else {
            currentEnv += `\nGITHUB_CLIENT_ID=${data.githubClientId.trim()}`;
          }

          if (currentEnv.includes('GITHUB_CLIENT_SECRET=')) {
            currentEnv = currentEnv.replace(/GITHUB_CLIENT_SECRET=.*/g, `GITHUB_CLIENT_SECRET=${data.githubClientSecret.trim()}`);
          } else {
            currentEnv += `\nGITHUB_CLIENT_SECRET=${data.githubClientSecret.trim()}`;
          }
        }

        fs.writeFileSync(envPath, currentEnv.trim() + '\n', 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, githubConfigured: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. API Route: Direct GitHub OAuth Redirection
  if (pathname === '/api/auth/github') {
    if (!process.env.GITHUB_CLIENT_ID) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 30px; text-align: center;">
  <h2>GitHub OAuth Credentials Not Configured</h2>
  <p>Please enter your <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> in the Solitaire setup or <code>.env</code> file.</p>
</body>
</html>`);
      return;
    }
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'solitaire.beechem.site';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${proto}://${host}/api/auth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
    res.writeHead(302, { Location: githubAuthUrl });
    res.end();
    return;
  }

  // 4. API Route: GitHub OAuth Callback
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
        uid: String(ghUser.id),
        displayName: ghUser.name || ghUser.login,
        email: ghUser.email || '',
        photoURL: ghUser.avatar_url || '',
        provider: 'github'
      };

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0b472a; color: white;">
  <h2>Authentication Successful!</h2>
  <p>Connecting to Solitaire...</p>
  <script>
    const user = ${JSON.stringify(authUser)};
    if (window.opener) {
      window.opener.postMessage({ type: 'SOLITAIRE_AUTH_SUCCESS', user: user }, '*');
      window.close();
    } else {
      localStorage.setItem('solitaire_auth_user', JSON.stringify(user));
      window.location.href = '/';
    }
  </script>
</body>
</html>`);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>GitHub Authentication Failed</h2><p>${err.message}</p>`);
    }
    return;
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
