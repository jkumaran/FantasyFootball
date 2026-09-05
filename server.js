const http = require('node:http');
const https = require('node:https');
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
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
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
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
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
