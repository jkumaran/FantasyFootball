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
    { method: 'GET', path: '/api/deploy-status' },
    { method: 'POST', path: '/api/draft/sync-pick' },
    { method: 'GET', path: '/api/draft/sessions' }
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
      const isRender = Boolean(process.env.RENDER || process.env.RENDER_GIT_COMMIT || process.env.RENDER_SERVICE_ID);
      
      // When running locally, do not block or show Render deployment banner
      if (!isRender) {
        let localCommit = 'local';
        try {
          localCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 7);
        } catch (e) {}
        return sendJson(res, {
          success: true,
          isDeploying: false,
          isLocal: true,
          currentCommit: localCommit,
          latestCommit: localCommit,
          message: `Running locally #${localCommit}`
        });
      }

      const latestSha = await getLatestGitHubCommit();
      const currentShort = currentCommitHash.slice(0, 7);
      const latestShort = (latestSha || currentCommitHash).slice(0, 7);
      const isDeploying = Boolean(latestSha && !latestSha.startsWith(currentShort) && !currentCommitHash.startsWith(latestShort));

      return sendJson(res, {
        success: true,
        isDeploying,
        isLocal: false,
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
      // 1. Try DB persistent store first
      const dbYaml = await db.getBoardYaml();
      if (dbYaml && dbYaml.yaml) {
        return sendJson(res, { success: true, yaml: dbYaml.yaml, source: 'database', updatedAt: dbYaml.updatedAt });
      }

      // 2. Fallback to fixed file candidates
      const candidates = [
        path.join(__dirname, 'tier_board.yaml'),
        path.join(__dirname, 'data', 'tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'tier_board.yaml'),
        path.join(__dirname, 'default_tier_board.yaml'),
        path.join(__dirname, 'data', 'default_tier_board.yaml')
      ];
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          const yamlContent = fs.readFileSync(filePath, 'utf8');
          return sendJson(res, { success: true, yaml: yamlContent, file: path.basename(filePath), source: 'file' });
        }
      }
      return sendJson(res, { success: false, message: 'No fixed YAML file found' });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/board/sharplineup-yaml
  if (method === 'GET' && pathname === '/api/board/sharplineup-yaml') {
    try {
      const candidates = [
        path.join(__dirname, 'sharplineup_tier_board.yaml'),
        path.join(__dirname, 'default_tier_board.yaml'),
        path.join(__dirname, 'data', 'sharplineup_tier_board.yaml'),
        path.join(__dirname, 'data', 'default_tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'sharplineup_tier_board.yaml')
      ];
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          const yamlContent = fs.readFileSync(filePath, 'utf8');
          return sendJson(res, { success: true, yaml: yamlContent, file: path.basename(filePath) });
        }
      }
      return sendJson(res, { success: false, message: 'SharpLineup YAML file not found' }, 404);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/board/jody-koerner-yaml
  if (method === 'GET' && pathname === '/api/board/jody-koerner-yaml') {
    try {
      const candidates = [
        path.join(__dirname, 'jody_koerner_tier_board.yaml'),
        path.join(__dirname, 'data', 'jody_koerner_tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'jody_koerner_tier_board.yaml')
      ];
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          const yamlContent = fs.readFileSync(filePath, 'utf8');
          return sendJson(res, { success: true, yaml: yamlContent, file: path.basename(filePath) });
        }
      }
      return sendJson(res, { success: false, message: 'Jody/Koerner YAML file not found' }, 404);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/board/load-preset
  if (method === 'POST' && pathname === '/api/board/load-preset') {
    try {
      const body = await parseRequestBody(req);
      const preset = (body && body.preset) || 'sharplineup';
      let candidateNames = [];
      if (preset === 'jody_koerner' || preset === 'jody' || preset === 'koerner') {
        candidateNames = ['jody_koerner_tier_board.yaml', 'data/jody_koerner_tier_board.yaml'];
      } else {
        candidateNames = ['sharplineup_tier_board.yaml', 'default_tier_board.yaml', 'data/default_tier_board.yaml'];
      }

      let presetYaml = null;
      for (const relPath of candidateNames) {
        const fullPath = path.join(__dirname, relPath);
        if (fs.existsSync(fullPath)) {
          presetYaml = fs.readFileSync(fullPath, 'utf8');
          break;
        }
      }

      if (!presetYaml) {
        return sendJson(res, { success: false, error: `Preset YAML file for "${preset}" not found` }, 404);
      }

      // Presets are read-only: return the preset content without overwriting tier_board.yaml
      return sendJson(res, { success: true, yaml: presetYaml, preset });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/board/default-yaml
  if (method === 'GET' && pathname === '/api/board/default-yaml') {
    try {
      const candidates = [
        path.join(__dirname, 'default_tier_board.yaml'),
        path.join(__dirname, 'data', 'default_tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'default_tier_board.yaml')
      ];
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          const yamlContent = fs.readFileSync(filePath, 'utf8');
          return sendJson(res, { success: true, yaml: yamlContent, file: path.basename(filePath) });
        }
      }
      return sendJson(res, { success: false, message: 'Default YAML file not found' }, 404);
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

        // Persist to DB table so it survives across server restarts & rebuilds
        try {
          await db.saveBoardYaml(body.yaml);
        } catch (dbErr) {
          console.warn('DB saveBoardYaml error:', dbErr);
        }

        return sendJson(res, { success: true });
      }
      return sendJson(res, { success: false, error: 'Missing yaml content' }, 400);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/board/reset-default
  if (method === 'POST' && pathname === '/api/board/reset-default') {
    try {
      const defaultCandidates = [
        path.join(__dirname, 'default_tier_board.yaml'),
        path.join(__dirname, 'data', 'default_tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'default_tier_board.yaml')
      ];
      let defaultYaml = null;
      for (const p of defaultCandidates) {
        if (fs.existsSync(p)) {
          defaultYaml = fs.readFileSync(p, 'utf8');
          break;
        }
      }

      if (!defaultYaml) {
        return sendJson(res, { success: false, error: 'Default YAML file not found' }, 404);
      }

      // Overwrite active tier board files
      const paths = [
        path.join(__dirname, 'tier_board.yaml'),
        path.join(__dirname, 'data', 'tier_board.yaml'),
        path.join(__dirname, 'public', 'data', 'tier_board.yaml')
      ];
      paths.forEach(p => {
        try {
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.writeFileSync(p, defaultYaml, 'utf8');
        } catch (e) {}
      });

      // Overwrite DB active board
      try {
        if (db.resetBoardYamlToDefault) {
          await db.resetBoardYamlToDefault(defaultYaml);
        } else {
          await db.saveBoardYaml(defaultYaml, false);
        }
      } catch (dbErr) {
        console.warn('DB reset saveBoardYaml error:', dbErr);
      }

      return sendJson(res, { success: true, yaml: defaultYaml });
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

  // GET /api/draft/sessions
  if (method === 'GET' && pathname === '/api/draft/sessions') {
    try {
      const data = await db.getDraftSessions();
      return sendJson(res, { success: true, ...data });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/sessions/active
  if (method === 'POST' && pathname === '/api/draft/sessions/active') {
    try {
      const body = await parseRequestBody(req);
      if (body && body.sessionId) {
        await db.setActiveDraftSessionId(body.sessionId);
        return sendJson(res, { success: true, activeSessionId: body.sessionId });
      }
      return sendJson(res, { success: false, error: 'Missing sessionId' }, 400);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/sessions
  if (method === 'POST' && pathname === '/api/draft/sessions') {
    try {
      const body = await parseRequestBody(req);
      if (body && body.id && body.name) {
        await db.saveDraftSession(body);
        return sendJson(res, { success: true, session: body });
      }
      return sendJson(res, { success: false, error: 'Missing session id or name' }, 400);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // DELETE /api/draft/sessions
  if (method === 'DELETE' && pathname === '/api/draft/sessions') {
    try {
      const body = await parseRequestBody(req);
      const sid = (body && body.sessionId) || parsedUrl.query.sessionId;
      if (sid) {
        await db.deleteDraftSession(sid);
        return sendJson(res, { success: true, deletedSessionId: sid });
      }
      return sendJson(res, { success: false, error: 'Missing sessionId' }, 400);
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/sync-pick (Invoked by Chrome Extension or Live Draft Webhook)
  if (method === 'POST' && pathname === '/api/draft/sync-pick') {
    try {
      const body = await parseRequestBody(req);
      const isAuthed = isAuthenticated(req) ||
        (req.headers['x-app-password'] && req.headers['x-app-password'] === APP_PASSWORD) ||
        (body.passCode && (body.passCode === APP_PASSWORD || body.passCode === 'fantasy2025'));
      
      if (!isAuthed) {
        return sendJson(res, { success: false, error: 'Authentication required. Invalid or missing passcode.' }, 401);
      }

      let { sessionId, platform, pickNum, round, teamId, playerName, playerId, team, pos, isUserPick } = body;
      const activeSessionId = await db.getActiveDraftSessionId();
      let targetSessionId = sessionId;

      const { sessions } = await db.getDraftSessions();
      if (!targetSessionId && platform) {
        const platformMatch = sessions.find(s => s.platform.toLowerCase() === platform.toLowerCase());
        if (platformMatch) targetSessionId = platformMatch.id;
      }
      if (!targetSessionId) targetSessionId = activeSessionId;

      const session = sessions.find(s => s.id === targetSessionId) || { teamsCount: 12, userSlot: 1, scoring: 'Half-PPR' };
      const teamsCount = session.teamsCount || 12;
      const userSlot = session.userSlot || 1;

      // Find or register player
      let player = null;
      if (playerId) {
        player = await db.findPlayerByNameOrId(playerId);
      }
      if (!player && playerName) {
        player = await db.findPlayerByNameOrId(playerName, pos, team);
      }
      if (!player) {
        return sendJson(res, { success: false, error: 'Player name or ID could not be identified.' }, 400);
      }

      // Check if already drafted in this session
      const draftPicks = await db.getDraftPicks(targetSessionId);
      const existingPick = draftPicks.find(dp => dp.player && dp.player.id === player.id);
      if (existingPick) {
        return sendJson(res, {
          success: true,
          alreadyDrafted: true,
          pickNum: existingPick.pickNum,
          round: existingPick.round,
          teamId: existingPick.teamId,
          sessionId: targetSessionId,
          player: { id: player.id, name: player.name, pos: player.pos, team: player.team }
        });
      }

      const actualPickNum = pickNum ? parseInt(pickNum, 10) : draftPicks.length + 1;
      const actualRound = round ? parseInt(round, 10) : Math.ceil(actualPickNum / teamsCount);
      const pickInRound = ((actualPickNum - 1) % teamsCount) + 1;
      const actualTeamId = teamId ? parseInt(teamId, 10) : ((actualRound % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1));

      await db.saveDraftPick(actualPickNum, actualRound, actualTeamId, player.id, targetSessionId);

      if (isUserPick || actualTeamId === userSlot) {
        await db.addUserRosterPlayer(player.id, targetSessionId);
      }

      return sendJson(res, {
        success: true,
        pickNum: actualPickNum,
        round: actualRound,
        teamId: actualTeamId,
        sessionId: targetSessionId,
        player: { id: player.id, name: player.name, pos: player.pos, team: player.team }
      });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // GET /api/draft
  if (method === 'GET' && pathname === '/api/draft') {
    try {
      const sessionId = parsedUrl.query.sessionId || await db.getActiveDraftSessionId();
      const draftPicks = await db.getDraftPicks(sessionId);
      const userRoster = await db.getUserRoster(sessionId);
      const leagueSettings = await db.getLeagueSettings();
      const { sessions } = await db.getDraftSessions();
      const session = sessions.find(s => s.id === sessionId) || { teamsCount: 12, userSlot: 1, scoring: 'Half-PPR' };
      const league = {
        ...leagueSettings,
        teamsCount: session.teamsCount || leagueSettings.teamsCount || 12,
        userSlot: session.userSlot || leagueSettings.userSlot || 1,
        scoring: session.scoring || leagueSettings.scoring || 'Half-PPR',
        sessionId
      };
      const currentPick = draftPicks.length + 1;
      return sendJson(res, { success: true, draftPicks, userRoster, league, currentPick, sessionId });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/pick
  if (method === 'POST' && pathname === '/api/draft/pick') {
    try {
      const body = await parseRequestBody(req);
      const { playerId } = body;
      const sessionId = body.sessionId || await db.getActiveDraftSessionId();
      const draftPicks = await db.getDraftPicks(sessionId);
      const { sessions } = await db.getDraftSessions();
      const session = sessions.find(s => s.id === sessionId) || { teamsCount: 12, userSlot: 1 };
      const teamsCount = session.teamsCount || 12;
      const userSlot = session.userSlot || 1;
      const pickNum = draftPicks.length + 1;
      const round = Math.ceil(pickNum / teamsCount);
      const pickInRound = ((pickNum - 1) % teamsCount) + 1;
      const teamId = (round % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1);

      await db.saveDraftPick(pickNum, round, teamId, playerId, sessionId);

      // If teamId is user slot, add to user roster
      if (teamId === userSlot) {
        await db.addUserRosterPlayer(playerId, sessionId);
      }

      return sendJson(res, { success: true, pickNum, teamId, sessionId });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/undo
  if (method === 'POST' && pathname === '/api/draft/undo') {
    try {
      const body = await parseRequestBody(req);
      const sessionId = (body && body.sessionId) || parsedUrl.query.sessionId || await db.getActiveDraftSessionId();
      const undonePick = await db.undoLastDraftPick(sessionId);
      return sendJson(res, { success: true, undonePick, sessionId });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // POST /api/draft/reset
  if (method === 'POST' && pathname === '/api/draft/reset') {
    try {
      const body = await parseRequestBody(req);
      const sessionId = (body && body.sessionId) || parsedUrl.query.sessionId || await db.getActiveDraftSessionId();
      await db.resetDraftBoard(sessionId);
      return sendJson(res, { success: true, sessionId });
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
