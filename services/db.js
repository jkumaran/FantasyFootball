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

// Draft Pick Methods
async function getDraftPicks() {
  const { rows } = await db.execute('SELECT dp.*, p.name, p.pos, p.team FROM draft_picks dp JOIN players p ON dp.player_id = p.id ORDER BY pick_num ASC');
  return rows.map(r => ({
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

async function saveDraftPick(pickNum, round, teamId, playerId) {
  await db.execute({
    sql: 'INSERT INTO draft_picks (pick_num, round, team_id, player_id, timestamp) VALUES (?, ?, ?, ?, ?)',
    args: [pickNum, round, teamId, playerId, new Date().toISOString()]
  });
}

async function undoLastDraftPick() {
  const { rows } = await db.execute('SELECT pick_num FROM draft_picks ORDER BY pick_num DESC LIMIT 1');
  if (rows.length > 0) {
    const lastPickNum = rows[0].pick_num;
    await db.execute({ sql: 'DELETE FROM draft_picks WHERE pick_num = ?', args: [lastPickNum] });
    return lastPickNum;
  }
  return null;
}

async function resetDraftBoard() {
  await db.execute('DELETE FROM draft_picks');
}

// User Roster Methods
async function getUserRoster() {
  const { rows } = await db.execute('SELECT player_id FROM user_roster');
  return rows.map(r => r.player_id);
}

async function addUserRosterPlayer(playerId) {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO user_roster (player_id, assigned_at) VALUES (?, ?)',
    args: [playerId, new Date().toISOString()]
  });
}

async function removeUserRosterPlayer(playerId) {
  await db.execute({
    sql: 'DELETE FROM user_roster WHERE player_id = ?',
    args: [playerId]
  });
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

async function saveBoardYaml(yaml) {
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
  getBoardYaml
};
