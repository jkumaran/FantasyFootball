const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const url = require('node:url');
const os = require('node:os');
const { execSync } = require('node:child_process');

const db = require('./services/db');
const { fetchPlayerNews } = require('./services/serpapi');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

// Track running git commit (Render provides RENDER_GIT_COMMIT)
let currentCommitHash = process.env.RENDER_GIT_COMMIT || '';
if (!currentCommitHash) {
  try {
    currentCommitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    currentCommitHash = 'f99c0bd';
  }
}

let cachedLatestCommit = null;
let lastCommitCheckTime = 0;

function getLatestGitHubCommit() {
  return new Promise((resolve) => {
    const now = Date.now();
    if (cachedLatestCommit && (now - lastCommitCheckTime < 5000)) {
      return resolve(cachedLatestCommit);
    }

    const options = {
      hostname: 'api.github.com',
      path: '/repos/jkumaran/FantasyFootball/commits/main',
      method: 'GET',
      headers: { 'User-Agent': 'FantasyFootball-App' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.sha) {
            cachedLatestCommit = parsed.sha;
            lastCommitCheckTime = now;
            return resolve(parsed.sha);
          }
        } catch (err) {}
        resolve(cachedLatestCommit || currentCommitHash);
      });
    });

    req.on('error', () => resolve(cachedLatestCommit || currentCommitHash));
    req.setTimeout(3500, () => {
      req.destroy();
      resolve(cachedLatestCommit || currentCommitHash);
    });
    req.end();
  });
}

// LAN IP helper for local device sharing
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.yaml': 'text/yaml; charset=UTF-8',
  '.yml': 'text/yaml; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const APP_PASSWORD = process.env.APP_PASSWORD || process.env.AUTH_PASSWORD || 'fantasy2025';
const AUTH_SECRET = process.env.AUTH_SECRET || 'gridiron-strategy-suite-auth-secret-key-42';

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts.shift().trim();
      if (key) {
        try {
          list[key] = decodeURIComponent(parts.join('=').trim());
        } catch (e) {
          list[key] = parts.join('=').trim();
        }
      }
    });
  }
  return list;
}

function createAuthToken(durationDays = 30) {
  const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
  const payload = `${expiresAt}`;
  const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const expectedHmac = crypto.createHmac('sha256', AUTH_SECRET).update(expiresAtStr).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedHmac, 'hex'));
  } catch (e) {
    return false;
  }
}

function isAuthenticated(req) {
  // 1. Check Cookie
  const cookies = parseCookies(req);
  if (cookies.auth_session && verifyAuthToken(cookies.auth_session)) {
    return true;
  }
  // 2. Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (verifyAuthToken(token) || token === APP_PASSWORD) return true;
  }
  // 3. Check X-App-Password header
  const xPass = req.headers['x-app-password'];
  if (xPass && xPass === APP_PASSWORD) return true;

  return false;
}

function sendJson(res, data, statusCode = 200, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Password',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
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

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Password'
    });
    return res.end();
  }

  // --- AUTH ROUTES ---

  // GET /api/auth/status
  if (method === 'GET' && pathname === '/api/auth/status') {
    const authed = isAuthenticated(req);
    return sendJson(res, { success: true, authenticated: authed });
  }

  // POST /api/auth/login
  if (method === 'POST' && pathname === '/api/auth/login') {
    try {
      const body = await parseRequestBody(req);
      const { password, durationDays } = body;
      if (password && password.trim() === APP_PASSWORD.trim()) {
        const days = (durationDays === 1 || durationDays === '1' || durationDays === '1d') ? 1 : 30;
        const token = createAuthToken(days);
        const maxAge = days * 24 * 60 * 60; // seconds
        const isHttps = req.headers['x-forwarded-proto'] === 'https';
        const secureFlag = isHttps ? '; Secure' : '';
        const cookieHeader = `auth_session=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureFlag}`;
        return sendJson(res, { success: true, authenticated: true, durationDays: days }, 200, { 'Set-Cookie': cookieHeader });
      } else {
        return sendJson(res, { success: false, error: 'Incorrect password. Please try again.' }, 401);
      }
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/auth/logout
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const cookieHeader = 'auth_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax';
    return sendJson(res, { success: true, authenticated: false }, 200, { 'Set-Cookie': cookieHeader });
  }

  // --- STRICT ACCESS CONTROL (NO VIEW-ONLY MODE: AUTH REQUIRED FOR ALL DATA) ---
  const publicApiRoutes = [
    { method: 'GET', path: '/api/auth/status' },
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/logout' },
    { method: 'GET', path: '/api/deploy-status' }
  ];

  const isPublicApi = publicApiRoutes.some(r => r.method === method && r.path === pathname);
  if (pathname.startsWith('/api/') && !isPublicApi && !isAuthenticated(req)) {
    return sendJson(res, {
      success: false,
      error: 'Authentication required. Please enter your passcode to access the suite.',
      code: 'UNAUTHORIZED'
    }, 401);
  }

  // --- API ROUTES ---

  // GET /api/deploy-status
  if (method === 'GET' && pathname === '/api/deploy-status') {
    try {
      const latestSha = await getLatestGitHubCommit();
      const currentShort = currentCommitHash.slice(0, 7);
      const latestShort = (latestSha || currentCommitHash).slice(0, 7);
      const isDeploying = Boolean(latestSha && !latestSha.startsWith(currentShort) && !currentCommitHash.startsWith(latestShort));

      return sendJson(res, {
        success: true,
        isDeploying,
        currentCommit: currentShort,
        latestCommit: latestShort,
        message: isDeploying
          ? `Render is building commit #${latestShort}... Waiting to deploy...`
          : `Running commit #${currentShort}`
      });
    } catch (err) {
      return sendJson(res, { success: true, isDeploying: false, currentCommit: currentCommitHash.slice(0, 7) });
    }
  }

  // GET /api/board/yaml
  if (method === 'GET' && pathname === '/api/board/yaml') {
    try {
      const candidates = [
        path.join(__dirname, 'tier_board.yaml'),
        path.join(__dirname, 'data', 'tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'tier_board.yaml')
      ];
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          const yamlContent = fs.readFileSync(filePath, 'utf8');
          return sendJson(res, { success: true, yaml: yamlContent, file: path.basename(filePath) });
        }
      }
      return sendJson(res, { success: false, message: 'No fixed YAML file found' });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/board/yaml
  if (method === 'POST' && pathname === '/api/board/yaml') {
    try {
      const body = await parseRequestBody(req);
      if (body && body.yaml) {
        const paths = [
          path.join(__dirname, 'tier_board.yaml'),
          path.join(__dirname, 'data', 'tier_board.yaml'),
          path.join(__dirname, 'public', 'data', 'tier_board.yaml')
        ];
        paths.forEach(p => {
          try {
            fs.mkdirSync(path.dirname(p), { recursive: true });
            fs.writeFileSync(p, body.yaml, 'utf8');
          } catch (e) {}
        });
        return sendJson(res, { success: true });
      }
      return sendJson(res, { success: false, error: 'Missing yaml content' }, 400);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/players
  if (method === 'GET' && pathname === '/api/players') {
    try {
      const players = await db.getAllPlayers();
      return sendJson(res, { success: true, players });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // PUT /api/players/tier
  if (method === 'PUT' && pathname === '/api/players/tier') {
    try {
      const body = await parseRequestBody(req);
      await db.updatePlayerTier(body.id, body.tier);
      return sendJson(res, { success: true });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // PUT /api/players/rank
  if (method === 'PUT' && pathname === '/api/players/rank') {
    try {
      const body = await parseRequestBody(req);
      await db.updatePlayerRank(body.id, body.rank);
      return sendJson(res, { success: true });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/draft
  if (method === 'GET' && pathname === '/api/draft') {
    try {
      const draftPicks = await db.getDraftPicks();
      const userRoster = await db.getUserRoster();
      const league = await db.getLeagueSettings();
      const currentPick = draftPicks.length + 1;
      return sendJson(res, { success: true, draftPicks, userRoster, league, currentPick });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/pick
  if (method === 'POST' && pathname === '/api/draft/pick') {
    try {
      const body = await parseRequestBody(req);
      const { playerId } = body;
      const draftPicks = await db.getDraftPicks();
      const league = await db.getLeagueSettings();
      const teamsCount = league.teamsCount || 12;
      const pickNum = draftPicks.length + 1;
      const round = Math.ceil(pickNum / teamsCount);
      const pickInRound = ((pickNum - 1) % teamsCount) + 1;
      const teamId = (round % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1);

      await db.saveDraftPick(pickNum, round, teamId, playerId);

      // If teamId is user slot, add to user roster
      if (teamId === (league.userSlot || 1)) {
        await db.addUserRosterPlayer(playerId);
      }

      return sendJson(res, { success: true, pickNum, teamId });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/undo
  if (method === 'POST' && pathname === '/api/draft/undo') {
    try {
      const undonePick = await db.undoLastDraftPick();
      return sendJson(res, { success: true, undonePick });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/reset
  if (method === 'POST' && pathname === '/api/draft/reset') {
    try {
      await db.resetDraftBoard();
      return sendJson(res, { success: true });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/sync/news
  if (method === 'POST' && pathname === '/api/sync/news') {
    try {
      const newsResult = await fetchPlayerNews();
      return sendJson(res, { success: true, news: newsResult });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/settings
  if (method === 'GET' && pathname === '/api/settings') {
    try {
      const settings = await db.getLeagueSettings();
      return sendJson(res, { success: true, settings });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/settings
  if (method === 'POST' && pathname === '/api/settings') {
    try {
      const body = await parseRequestBody(req);
      await db.saveLeagueSettings(body);
      return sendJson(res, { success: true });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // --- STATIC FILE SERVER ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Safe path check
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // Block direct download of YAML files if not authenticated
  if ((pathname.endsWith('.yaml') || pathname.endsWith('.yml')) && !isAuthenticated(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Unauthorized. Passcode required.' }));
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback to index.html for non-API requests
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, HOST, () => {
  const lanIp = getLanIp();
  console.log(`\n🏈 Fantasy Football Web Suite Server Running!`);
  console.log(`------------------------------------------------`);
  console.log(`Local Access:   http://localhost:${PORT}`);
  console.log(`Network Access: http://${lanIp}:${PORT}`);
  console.log(`Turso Cloud DB: Active (@libsql/client)`);
  console.log(`------------------------------------------------\n`);
});
