const { createClient } = require('@libsql/client');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'fantasy.db');

// Ensure data directory exists if using local file
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let secrets = {};
try {
  secrets = require('../config/secrets.json');
} catch (e) {
  // Secrets file missing, fallback to env vars
}

// Connect to Turso if environment variables or secrets exist, otherwise fallback to local SQLite
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || secrets.turso_database_url || `file:${DB_PATH}`,
  authToken: process.env.TURSO_AUTH_TOKEN || secrets.turso_auth_token
});

// Default Initial Player Dataset (Top 300 from SharpLineup)
let INITIAL_PLAYERS = [];
try {
  INITIAL_PLAYERS = require('../data/initial_players.json');
} catch (e) {
  INITIAL_PLAYERS = [];
}

// Initialize Database Schema & Seed Data
async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pos TEXT NOT NULL,
      team TEXT NOT NULL,
      bye INTEGER,
      ecr INTEGER,
      custom_rank INTEGER,
      tier INTEGER DEFAULT 1,
      projected_pts REAL,
      floor_pts REAL,
      ceiling_pts REAL,
      target_share REAL,
      redzone_touches INTEGER,
      air_yards_share REAL,
      past_pts REAL,
      opponent TEXT,
      opponent_rank INTEGER,
      matchup_grade TEXT,
      notes TEXT,
      sleeper_tag TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS draft_picks (
      pick_num INTEGER PRIMARY KEY,
      round INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_roster (
      player_id TEXT PRIMARY KEY,
      assigned_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS league_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS news_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      query TEXT,
      articles_synced INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS board_state (
      key TEXT PRIMARY KEY,
      yaml TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS draft_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      teams_count INTEGER DEFAULT 12,
      user_slot INTEGER DEFAULT 1,
      scoring TEXT DEFAULT 'Half-PPR',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS session_draft_picks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      pick_num INTEGER NOT NULL,
      round INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      UNIQUE(session_id, pick_num)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS session_user_roster (
      session_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      PRIMARY KEY (session_id, player_id)
    );
  `);

  // Seed default draft sessions if empty
  try {
    try {
      await db.execute('ALTER TABLE draft_sessions ADD COLUMN league_id TEXT');
    } catch (e) {}

    const sessionCheck = await db.execute('SELECT COUNT(*) as count FROM draft_sessions');
    if (sessionCheck.rows && sessionCheck.rows[0].count === 0) {
      const defaultSessions = [
        { id: 'yahoo-1', name: 'Yahoo: League 1', platform: 'yahoo', teams_count: 12, user_slot: 1 },
        { id: 'espn-2', name: 'ESPN: League 2', platform: 'espn', teams_count: 10, user_slot: 4 },
        { id: 'sleeper-3', name: 'Sleeper: League 3', platform: 'sleeper', teams_count: 12, user_slot: 2 },
        { id: 'mock', name: 'Manual / Mock', platform: 'manual', teams_count: 12, user_slot: 1 }
      ];
      const now = new Date().toISOString();
      for (const s of defaultSessions) {
        await db.execute({
          sql: 'INSERT INTO draft_sessions (id, name, platform, teams_count, user_slot, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [s.id, s.name, s.platform, s.teams_count, s.user_slot, now, now]
        });
      }
    }
  } catch (e) {
    console.warn('Draft sessions seed error:', e);
  }

  // Check if players table needs seeding/updating with initial 300 dataset
  const { rows } = await db.execute('SELECT COUNT(*) as count FROM players');
  if (rows[0].count < INITIAL_PLAYERS.length) {
    for (const p of INITIAL_PLAYERS) {
      await savePlayer(p);
    }
  }

  // Seed default user roster starters if empty
  const rosterCheck = await db.execute('SELECT COUNT(*) as count FROM user_roster');
  if (rosterCheck.rows[0].count === 0) {
    const defaultStarters = ['rb-904', 'wr-902', 'qb-774', 'te-899'];
    for (const pid of defaultStarters) {
      await addUserRosterPlayer(pid);
    }
  }

  // Seed Golden Jody baseline into active_board if not seeded yet
  try {
    const seedCheck = await db.execute("SELECT yaml FROM board_state WHERE key = 'golden_jody_v2_seeded'");
    if (!seedCheck.rows || seedCheck.rows.length === 0) {
      const candidates = [
        path.join(__dirname, '..', 'data', 'golden_jody_tier_board.yaml'),
        path.join(__dirname, '..', 'data', 'tier_board.yaml'),
        path.join(__dirname, '..', 'tier_board.yaml')
      ];
      let jodyYaml = null;
      for (const cp of candidates) {
        if (fs.existsSync(cp)) {
          jodyYaml = fs.readFileSync(cp, 'utf8');
          break;
        }
      }
      if (jodyYaml) {
        const now = new Date().toISOString();
        const userSavedCheck = await db.execute("SELECT yaml FROM board_state WHERE key = 'user_custom_saved'");
        const hasExplicitUserSave = userSavedCheck.rows && userSavedCheck.rows.length > 0 && userSavedCheck.rows[0].yaml === 'true';

        if (!hasExplicitUserSave) {
          await db.execute({
            sql: `
              INSERT INTO board_state (key, yaml, updated_at)
              VALUES ('active_board', ?, ?)
              ON CONFLICT(key) DO UPDATE SET
                yaml = excluded.yaml,
                updated_at = excluded.updated_at
            `,
            args: [jodyYaml, now]
          });
        }

        await db.execute({
          sql: `
            INSERT INTO board_state (key, yaml, updated_at)
            VALUES ('golden_jody_v2_seeded', 'true', ?)
            ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at
          `,
          args: [now]
        });
      }
    }
  } catch (seedErr) {
    console.warn('Seed golden jody error in initDb:', seedErr);
  }
}

// Call initDb
initDb().catch(console.error);

async function savePlayer(p) {
  await db.execute({
    sql: `
      INSERT INTO players (
        id, name, pos, team, bye, ecr, custom_rank, tier,
        projected_pts, floor_pts, ceiling_pts, target_share,
        redzone_touches, air_yards_share, past_pts, opponent,
        opponent_rank, matchup_grade, notes, sleeper_tag
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      ) ON CONFLICT(id) DO UPDATE SET
        ecr = excluded.ecr,
        custom_rank = excluded.custom_rank,
        tier = excluded.tier,
        projected_pts = excluded.projected_pts,
        notes = excluded.notes,
        sleeper_tag = excluded.sleeper_tag
    `,
    args: [
      p.id, p.name, p.pos, p.team, p.bye, p.ecr, p.customRank || p.ecr, p.tier || 1,
      p.projectedPts || 0, p.floorPts || 0, p.ceilingPts || 0, p.targetShare || 0,
      p.redzoneTouches || 0, p.airYardsShare || 0, p.pastPts || 0, p.opponent || 'N/A',
      p.opponentRank || 16, p.matchupGrade || 'B', p.notes || '', p.sleeperTag || null
    ]
  });
}

async function getAllPlayers() {
  const { rows } = await db.execute('SELECT * FROM players ORDER BY custom_rank ASC, ecr ASC');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    pos: r.pos,
    team: r.team,
    bye: r.bye,
    ecr: r.ecr,
    customRank: r.custom_rank,
    tier: r.tier,
    projectedPts: r.projected_pts,
    floorPts: r.floor_pts,
    ceilingPts: r.ceiling_pts,
    targetShare: r.target_share,
    redzoneTouches: r.redzone_touches,
    airYardsShare: r.air_yards_share,
    pastPts: r.past_pts,
    opponent: r.opponent,
    opponentRank: r.opponent_rank,
    matchupGrade: r.matchup_grade,
    notes: r.notes,
    sleeperTag: r.sleeper_tag
  }));
}

async function updatePlayerTier(id, tier) {
  await db.execute({
    sql: 'UPDATE players SET tier = ? WHERE id = ?',
    args: [parseInt(tier, 10), id]
  });
}

async function updatePlayerRank(id, rank) {
  await db.execute({
    sql: 'UPDATE players SET custom_rank = ? WHERE id = ?',
    args: [parseInt(rank, 10), id]
  });
}

async function updatePlayerNotes(id, notes, sleeperTag = null) {
  if (sleeperTag) {
    await db.execute({
      sql: 'UPDATE players SET notes = ?, sleeper_tag = ? WHERE id = ?',
      args: [notes, sleeperTag, id]
    });
  } else {
    await db.execute({
      sql: 'UPDATE players SET notes = ? WHERE id = ?',
      args: [notes, id]
    });
  }
}

function normalizePlayerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(d\/st|def|dst)\s+/i, '')
    .replace(/\s+(d\/st|def|dst)$/i, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function findPlayerByNameOrId(nameOrId, pos = null, team = null) {
  if (!nameOrId) return null;
  const { rows } = await db.execute('SELECT * FROM players');
  
  // 1. Direct ID match
  const direct = rows.find(p => p.id.toLowerCase() === String(nameOrId).toLowerCase());
  if (direct) return direct;

  const targetNorm = normalizePlayerName(String(nameOrId));
  if (!targetNorm) return null;

  // 2. Exact normalized name match
  let matches = rows.filter(p => normalizePlayerName(p.name) === targetNorm);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && pos) {
    const posMatch = matches.find(p => p.pos.toLowerCase() === String(pos).toLowerCase());
    if (posMatch) return posMatch;
  }
  if (matches.length > 0) return matches[0];

  // 3. Substring match
  matches = rows.filter(p => {
    const pNorm = normalizePlayerName(p.name);
    return pNorm.includes(targetNorm) || targetNorm.includes(pNorm);
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && pos) {
    const posMatch = matches.find(p => p.pos.toLowerCase() === String(pos).toLowerCase());
    if (posMatch) return posMatch;
  }
  if (matches.length > 0) return matches[0];

  // 4. If not found in seed dataset, dynamically register player
  const newPos = (pos || 'FLEX').toUpperCase();
  const newTeam = (team || 'FA').toUpperCase();
  const cleanName = String(nameOrId).trim();
  const newId = `${newPos.toLowerCase()}-auto-${Date.now()}`;
  const newPlayer = {
    id: newId,
    name: cleanName,
    pos: newPos,
    team: newTeam,
    bye: 8,
    ecr: 250,
    customRank: 250,
    tier: 5,
    projectedPts: 120.0
  };
  await savePlayer(newPlayer);
  return newPlayer;
}

// Active Draft Session Management
async function getActiveDraftSessionId() {
  try {
    const { rows } = await db.execute("SELECT value FROM league_settings WHERE key = 'active_draft_session_id'");
    if (rows && rows.length > 0) {
      return JSON.parse(rows[0].value);
    }
  } catch (e) {}
  return 'yahoo-1';
}

async function setActiveDraftSessionId(sessionId) {
  await db.execute({
    sql: 'INSERT INTO league_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: ['active_draft_session_id', JSON.stringify(sessionId)]
  });
}

async function getDraftSessions() {
  const { rows } = await db.execute('SELECT * FROM draft_sessions ORDER BY created_at ASC');
  const activeId = await getActiveDraftSessionId();
  
  const sessions = [];
  for (const r of rows) {
    const pickRes = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM session_draft_picks WHERE session_id = ?',
      args: [r.id]
    });
    const pickCount = pickRes.rows[0].count;
    sessions.push({
      id: r.id,
      name: r.name,
      platform: r.platform,
      leagueId: r.league_id || null,
      teamsCount: r.teams_count,
      userSlot: r.user_slot,
      scoring: r.scoring || 'Half-PPR',
      currentPick: pickCount + 1,
      draftPicksCount: pickCount,
      updatedAt: r.updated_at,
      isActive: r.id === activeId
    });
  }
  return { activeSessionId: activeId, sessions };
}

async function saveDraftSession(s) {
  const now = new Date().toISOString();
  try {
    await db.execute({
      sql: `INSERT INTO draft_sessions (id, name, platform, teams_count, user_slot, scoring, league_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              platform = excluded.platform,
              teams_count = excluded.teams_count,
              user_slot = excluded.user_slot,
              scoring = excluded.scoring,
              league_id = excluded.league_id,
              updated_at = excluded.updated_at`,
      args: [s.id, s.name, s.platform, s.teamsCount || 12, s.userSlot || 1, s.scoring || 'Half-PPR', s.leagueId || null, now, now]
    });
  } catch (e) {
    await db.execute({
      sql: `INSERT INTO draft_sessions (id, name, platform, teams_count, user_slot, scoring, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              platform = excluded.platform,
              teams_count = excluded.teams_count,
              user_slot = excluded.user_slot,
              scoring = excluded.scoring,
              updated_at = excluded.updated_at`,
      args: [s.id, s.name, s.platform, s.teamsCount || 12, s.userSlot || 1, s.scoring || 'Half-PPR', now, now]
    });
  }
}

async function deleteDraftSession(sessionId) {
  await db.execute({ sql: 'DELETE FROM session_draft_picks WHERE session_id = ?', args: [sessionId] });
  await db.execute({ sql: 'DELETE FROM session_user_roster WHERE session_id = ?', args: [sessionId] });
  await db.execute({ sql: 'DELETE FROM draft_sessions WHERE id = ?', args: [sessionId] });
}

// Draft Pick Methods (Multi-Session Supported)
async function getDraftPicks(sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  const { rows } = await db.execute({
    sql: `SELECT sdp.pick_num, sdp.round, sdp.team_id, p.id, p.name, p.pos, p.team
          FROM session_draft_picks sdp
          JOIN players p ON sdp.player_id = p.id
          WHERE sdp.session_id = ?
          ORDER BY sdp.pick_num ASC`,
    args: [targetSession]
  });
  if (rows && rows.length > 0) {
    return rows.map(r => ({
      pickNum: r.pick_num,
      round: r.round,
      teamId: r.team_id,
      player: {
        id: r.id,
        name: r.name,
        pos: r.pos,
        team: r.team
      }
    }));
  }
  // Fallback to legacy draft_picks if targetSession is 'default' or 'mock'
  if (targetSession === 'default' || targetSession === 'mock') {
    const legacy = await db.execute('SELECT dp.*, p.name, p.pos, p.team FROM draft_picks dp JOIN players p ON dp.player_id = p.id ORDER BY pick_num ASC');
    return legacy.rows.map(r => ({
      pickNum: r.pick_num,
      round: r.round,
      teamId: r.team_id,
      player: {
        id: r.player_id,
        name: r.name,
        pos: r.pos,
        team: r.team
      }
    }));
  }
  return [];
}

async function saveDraftPick(pickNum, round, teamId, playerId, sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO session_draft_picks (session_id, pick_num, round, team_id, player_id, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id, pick_num) DO UPDATE SET
            round = excluded.round,
            team_id = excluded.team_id,
            player_id = excluded.player_id,
            timestamp = excluded.timestamp`,
    args: [targetSession, pickNum, round, teamId, playerId, now]
  });

  // Also mirror to legacy draft_picks for backwards compatibility
  try {
    await db.execute({
      sql: 'INSERT INTO draft_picks (pick_num, round, team_id, player_id, timestamp) VALUES (?, ?, ?, ?, ?) ON CONFLICT(pick_num) DO UPDATE SET player_id = excluded.player_id',
      args: [pickNum, round, teamId, playerId, now]
    });
  } catch (e) {}

  // Update session updated_at
  try {
    await db.execute({
      sql: 'UPDATE draft_sessions SET updated_at = ? WHERE id = ?',
      args: [now, targetSession]
    });
  } catch (e) {}
}

async function undoLastDraftPick(sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  const { rows } = await db.execute({
    sql: 'SELECT pick_num, player_id, team_id FROM session_draft_picks WHERE session_id = ? ORDER BY pick_num DESC LIMIT 1',
    args: [targetSession]
  });
  if (rows.length > 0) {
    const lastPickNum = rows[0].pick_num;
    const lastPlayerId = rows[0].player_id;
    await db.execute({
      sql: 'DELETE FROM session_draft_picks WHERE session_id = ? AND pick_num = ?',
      args: [targetSession, lastPickNum]
    });
    await db.execute({
      sql: 'DELETE FROM session_user_roster WHERE session_id = ? AND player_id = ?',
      args: [targetSession, lastPlayerId]
    });
    try {
      await db.execute({ sql: 'DELETE FROM draft_picks WHERE pick_num = ?', args: [lastPickNum] });
      await db.execute({ sql: 'DELETE FROM user_roster WHERE player_id = ?', args: [lastPlayerId] });
    } catch (e) {}
    return lastPickNum;
  }
  return null;
}

async function resetDraftBoard(sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  await db.execute({ sql: 'DELETE FROM session_draft_picks WHERE session_id = ?', args: [targetSession] });
  await db.execute({ sql: 'DELETE FROM session_user_roster WHERE session_id = ?', args: [targetSession] });
  try {
    await db.execute('DELETE FROM draft_picks');
    await db.execute('DELETE FROM user_roster');
  } catch (e) {}
}

// User Roster Methods (Multi-Session Supported)
async function getUserRoster(sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  const { rows } = await db.execute({
    sql: 'SELECT player_id FROM session_user_roster WHERE session_id = ?',
    args: [targetSession]
  });
  if (rows && rows.length > 0) {
    return rows.map(r => r.player_id);
  }
  const legacy = await db.execute('SELECT player_id FROM user_roster');
  return legacy.rows.map(r => r.player_id);
}

async function addUserRosterPlayer(playerId, sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT OR IGNORE INTO session_user_roster (session_id, player_id, assigned_at) VALUES (?, ?, ?)',
    args: [targetSession, playerId, now]
  });
  try {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO user_roster (player_id, assigned_at) VALUES (?, ?)',
      args: [playerId, now]
    });
  } catch (e) {}
}

async function removeUserRosterPlayer(playerId, sessionId = null) {
  const targetSession = sessionId || await getActiveDraftSessionId();
  await db.execute({
    sql: 'DELETE FROM session_user_roster WHERE session_id = ? AND player_id = ?',
    args: [targetSession, playerId]
  });
  try {
    await db.execute({
      sql: 'DELETE FROM user_roster WHERE player_id = ?',
      args: [playerId]
    });
  } catch (e) {}
}

// League Settings Methods
async function getLeagueSettings() {
  const { rows } = await db.execute('SELECT key, value FROM league_settings');
  const settings = {
    teamsCount: 12,
    format: 'Snake',
    scoring: 'Half-PPR',
    userSlot: 1,
    weeklyStrategy: 'CONSERVATIVE',
    opponentProjected: 115.0
  };

  rows.forEach(r => {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch (e) {
      settings[r.key] = r.value;
    }
  });

  return settings;
}

async function saveLeagueSettings(newSettings) {
  for (const [key, value] of Object.entries(newSettings)) {
    await db.execute({
      sql: 'INSERT INTO league_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      args: [key, JSON.stringify(value)]
    });
  }
}

async function logNewsSync(query, articlesCount, status = 'success') {
  await db.execute({
    sql: 'INSERT INTO news_logs (timestamp, query, articles_synced, status) VALUES (?, ?, ?, ?)',
    args: [new Date().toISOString(), query, articlesCount, status]
  });
}

async function saveBoardYaml(yaml, isUserCustom = true) {
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO board_state (key, yaml, updated_at)
      VALUES ('active_board', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        yaml = excluded.yaml,
        updated_at = excluded.updated_at
    `,
    args: [yaml, now]
  });

  if (isUserCustom) {
    await db.execute({
      sql: `
        INSERT INTO board_state (key, yaml, updated_at)
        VALUES ('user_custom_saved', 'true', ?)
        ON CONFLICT(key) DO UPDATE SET
          yaml = excluded.yaml,
          updated_at = excluded.updated_at
      `,
      args: [now]
    });
  }
}

async function resetBoardYamlToDefault(defaultYaml) {
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO board_state (key, yaml, updated_at)
      VALUES ('active_board', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        yaml = excluded.yaml,
        updated_at = excluded.updated_at
    `,
    args: [defaultYaml, now]
  });
  await db.execute({
    sql: `
      INSERT INTO board_state (key, yaml, updated_at)
      VALUES ('user_custom_saved', 'false', ?)
      ON CONFLICT(key) DO UPDATE SET
        yaml = excluded.yaml,
        updated_at = excluded.updated_at
    `,
    args: [now]
  });
}

async function getBoardYaml() {
  try {
    const { rows } = await db.execute("SELECT yaml, updated_at FROM board_state WHERE key = 'active_board'");
    if (rows && rows.length > 0) {
      return { yaml: rows[0].yaml, updatedAt: rows[0].updated_at };
    }
  } catch (e) {
    console.warn('DB getBoardYaml error:', e);
  }
  return null;
}

module.exports = {
  getAllPlayers,
  savePlayer,
  updatePlayerTier,
  updatePlayerRank,
  updatePlayerNotes,
  findPlayerByNameOrId,
  normalizePlayerName,
  getDraftSessions,
  saveDraftSession,
  deleteDraftSession,
  getActiveDraftSessionId,
  setActiveDraftSessionId,
  getDraftPicks,
  saveDraftPick,
  undoLastDraftPick,
  resetDraftBoard,
  getUserRoster,
  addUserRosterPlayer,
  removeUserRosterPlayer,
  getLeagueSettings,
  saveLeagueSettings,
  logNewsSync,
  saveBoardYaml,
  getBoardYaml,
  resetBoardYamlToDefault
};
