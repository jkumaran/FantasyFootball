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

// Default Initial Player Dataset
const INITIAL_PLAYERS = [
  { id: 'rb-1', name: 'Christian McCaffrey', pos: 'RB', team: 'SF', bye: 9, ecr: 1, customRank: 1, tier: 1, projectedPts: 312.4, floorPts: 16.8, ceilingPts: 28.5, targetShare: 18.5, redzoneTouches: 68, airYardsShare: 12.4, pastPts: 324.1, opponent: 'LA', opponentRank: 24, matchupGrade: 'A+', notes: 'Premier dual-threat engine in Kyle Shanahan offense.', sleeperTag: null },
  { id: 'rb-2', name: 'Breece Hall', pos: 'RB', team: 'NYJ', bye: 12, ecr: 3, customRank: 2, tier: 1, projectedPts: 278.2, floorPts: 13.5, ceilingPts: 26.0, targetShare: 15.2, redzoneTouches: 52, airYardsShare: 9.8, pastPts: 270.5, opponent: 'BUF', opponentRank: 18, matchupGrade: 'B+', notes: 'Explosive home-run threat with heavy target share.', sleeperTag: null },
  { id: 'rb-3', name: 'Bijan Robinson', pos: 'RB', team: 'ATL', bye: 12, ecr: 4, customRank: 3, tier: 1, projectedPts: 272.0, floorPts: 13.2, ceilingPts: 25.4, targetShare: 14.8, redzoneTouches: 55, airYardsShare: 8.5, pastPts: 248.3, opponent: 'CAR', opponentRank: 30, matchupGrade: 'A+', notes: 'Elite workhorse role under new offensive scheme.', sleeperTag: null },
  { id: 'rb-4', name: 'Saquon Barkley', pos: 'RB', team: 'PHI', bye: 5, ecr: 6, customRank: 4, tier: 1, projectedPts: 265.8, floorPts: 12.8, ceilingPts: 24.8, targetShare: 10.5, redzoneTouches: 58, airYardsShare: 6.2, pastPts: 225.0, opponent: 'DAL', opponentRank: 22, matchupGrade: 'A-', notes: 'Running behind elite offensive line. Dominates goal-line work.', sleeperTag: null },
  { id: 'rb-5', name: 'Jonathan Taylor', pos: 'RB', team: 'IND', bye: 14, ecr: 10, customRank: 5, tier: 2, projectedPts: 245.5, floorPts: 11.5, ceilingPts: 23.5, targetShare: 8.2, redzoneTouches: 48, airYardsShare: 4.5, pastPts: 215.4, opponent: 'HOU', opponentRank: 14, matchupGrade: 'B', notes: 'Pure volume rusher in fast-paced offense.', sleeperTag: null },
  { id: 'rb-6', name: 'Jahmyr Gibbs', pos: 'RB', team: 'DET', bye: 5, ecr: 12, customRank: 8, tier: 2, projectedPts: 240.1, floorPts: 10.8, ceilingPts: 25.0, targetShare: 13.5, redzoneTouches: 42, airYardsShare: 7.8, pastPts: 230.2, opponent: 'GB', opponentRank: 16, matchupGrade: 'B', notes: 'Dynamic playmaker with league-winning upside.', sleeperTag: 'SLEEPER' },
  { id: 'rb-7', name: 'Kyren Williams', pos: 'RB', team: 'LAR', bye: 6, ecr: 15, customRank: 11, tier: 2, projectedPts: 232.0, floorPts: 12.0, ceilingPts: 21.5, targetShare: 9.5, redzoneTouches: 50, airYardsShare: 5.0, pastPts: 242.0, opponent: 'SEA', opponentRank: 20, matchupGrade: 'B+', notes: 'High snap count percentage and heavy red-zone dominance.', sleeperTag: null },
  { id: 'rb-8', name: 'Derrick Henry', pos: 'RB', team: 'BAL', bye: 14, ecr: 16, customRank: 14, tier: 2, projectedPts: 228.4, floorPts: 10.0, ceilingPts: 24.0, targetShare: 4.5, redzoneTouches: 60, airYardsShare: 2.1, pastPts: 235.8, opponent: 'CLE', opponentRank: 8, matchupGrade: 'C+', notes: 'Paired with Lamar Jackson. TD monster potential.', sleeperTag: null },
  { id: 'rb-9', name: 'De\'Von Achane', pos: 'RB', team: 'MIA', bye: 6, ecr: 22, customRank: 16, tier: 3, projectedPts: 215.0, floorPts: 8.5, ceilingPts: 26.5, targetShare: 13.8, redzoneTouches: 35, airYardsShare: 9.2, pastPts: 195.0, opponent: 'NE', opponentRank: 26, matchupGrade: 'A', notes: 'Unmatched speed. Extreme ceiling per touch ratio.', sleeperTag: 'SLEEPER' },
  { id: 'rb-10', name: 'Isiah Pacheco', pos: 'RB', team: 'KC', bye: 6, ecr: 24, customRank: 20, tier: 3, projectedPts: 210.2, floorPts: 10.5, ceilingPts: 19.5, targetShare: 8.8, redzoneTouches: 44, airYardsShare: 4.0, pastPts: 202.1, opponent: 'LV', opponentRank: 21, matchupGrade: 'B+', notes: 'Hard-nosed runner in elite offense.', sleeperTag: null },
  { id: 'wr-1', name: 'CeeDee Lamb', pos: 'WR', team: 'DAL', bye: 7, ecr: 2, customRank: 2, tier: 1, projectedPts: 305.0, floorPts: 15.5, ceilingPts: 27.0, targetShare: 30.2, redzoneTouches: 28, airYardsShare: 38.5, pastPts: 335.2, opponent: 'NYG', opponentRank: 23, matchupGrade: 'A', notes: 'Uncontested target monster. High floor, sky-high ceiling.', sleeperTag: null },
  { id: 'wr-2', name: 'Tyreek Hill', pos: 'WR', team: 'MIA', bye: 6, ecr: 5, customRank: 5, tier: 1, projectedPts: 295.4, floorPts: 13.8, ceilingPts: 29.5, targetShare: 29.5, redzoneTouches: 22, airYardsShare: 42.1, pastPts: 318.4, opponent: 'BUF', opponentRank: 12, matchupGrade: 'B', notes: 'Game-breaking deep threat with incredible weekly explosion potential.', sleeperTag: null },
  { id: 'wr-3', name: 'Ja\'Marr Chase', pos: 'WR', team: 'CIN', bye: 12, ecr: 7, customRank: 6, tier: 1, projectedPts: 288.0, floorPts: 13.0, ceilingPts: 28.0, targetShare: 28.0, redzoneTouches: 25, airYardsShare: 36.8, pastPts: 260.5, opponent: 'PIT', opponentRank: 15, matchupGrade: 'B', notes: 'Joe Burrow pairing ensures elite red zone & deep opportunity.', sleeperTag: null },
  { id: 'wr-4', name: 'Justin Jefferson', pos: 'WR', team: 'MIN', bye: 6, ecr: 8, customRank: 7, tier: 1, projectedPts: 282.6, floorPts: 14.0, ceilingPts: 26.2, targetShare: 29.0, redzoneTouches: 20, airYardsShare: 40.0, pastPts: 250.0, opponent: 'GB', opponentRank: 17, matchupGrade: 'B+', notes: 'Best technician in NFL. QB-proof target vacuum.', sleeperTag: null },
  { id: 'wr-5', name: 'Amon-Ra St. Brown', pos: 'WR', team: 'DET', bye: 5, ecr: 9, customRank: 9, tier: 1, projectedPts: 280.2, floorPts: 14.8, ceilingPts: 24.5, targetShare: 28.5, redzoneTouches: 24, airYardsShare: 32.0, pastPts: 290.4, opponent: 'CHI', opponentRank: 19, matchupGrade: 'B+', notes: 'Slot god. Extremely safe Half-PPR floor every week.', sleeperTag: null },
  { id: 'wr-6', name: 'A.J. Brown', pos: 'WR', team: 'PHI', bye: 5, ecr: 11, customRank: 10, tier: 2, projectedPts: 260.0, floorPts: 12.2, ceilingPts: 25.5, targetShare: 26.5, redzoneTouches: 22, airYardsShare: 39.2, pastPts: 258.6, opponent: 'WAS', opponentRank: 29, matchupGrade: 'A+', notes: 'Physical alpha receiver. Huge YAC potential.', sleeperTag: null },
  { id: 'wr-7', name: 'Puka Nacua', pos: 'WR', team: 'LAR', bye: 6, ecr: 13, customRank: 12, tier: 2, projectedPts: 255.4, floorPts: 12.5, ceilingPts: 24.0, targetShare: 27.8, redzoneTouches: 21, airYardsShare: 34.5, pastPts: 270.0, opponent: 'SF', opponentRank: 10, matchupGrade: 'B-', notes: 'Record-setting sophomore receiver with Matthew Stafford synergy.', sleeperTag: null },
  { id: 'wr-8', name: 'Marvin Harrison Jr.', pos: 'WR', team: 'ARI', bye: 11, ecr: 14, customRank: 13, tier: 2, projectedPts: 245.0, floorPts: 10.5, ceilingPts: 24.8, targetShare: 26.0, redzoneTouches: 19, airYardsShare: 38.0, pastPts: 0, opponent: 'SEA', opponentRank: 20, matchupGrade: 'B+', notes: 'Generational rookie prospect stepping into WR1 role.', sleeperTag: 'SLEEPER' },
  { id: 'wr-9', name: 'Garrett Wilson', pos: 'WR', team: 'NYJ', bye: 12, ecr: 17, customRank: 15, tier: 2, projectedPts: 242.0, floorPts: 11.2, ceilingPts: 23.0, targetShare: 27.5, redzoneTouches: 20, airYardsShare: 37.0, pastPts: 185.0, opponent: 'DEN', opponentRank: 7, matchupGrade: 'C+', notes: 'Massive upgrade with Aaron Rodgers at QB.', sleeperTag: null },
  { id: 'wr-10', name: 'Nico Collins', pos: 'WR', team: 'HOU', bye: 14, ecr: 18, customRank: 17, tier: 3, projectedPts: 238.5, floorPts: 11.0, ceilingPts: 24.2, targetShare: 25.4, redzoneTouches: 18, airYardsShare: 35.8, pastPts: 220.4, opponent: 'IND', opponentRank: 25, matchupGrade: 'A', notes: 'CJ Stroud primary deep & red zone target.', sleeperTag: null },
  { id: 'qb-1', name: 'Josh Allen', pos: 'QB', team: 'BUF', bye: 12, ecr: 19, customRank: 18, tier: 1, projectedPts: 375.0, floorPts: 18.5, ceilingPts: 32.0, targetShare: 0, redzoneTouches: 45, airYardsShare: 0, pastPts: 392.5, opponent: 'MIA', opponentRank: 15, matchupGrade: 'B+', notes: 'Fantasy QB1 overall. Insane rushing TD floor + big arm passing upside.', sleeperTag: null },
  { id: 'qb-2', name: 'Jalen Hurts', pos: 'QB', team: 'PHI', bye: 5, ecr: 21, customRank: 19, tier: 1, projectedPts: 362.0, floorPts: 18.0, ceilingPts: 30.5, targetShare: 0, redzoneTouches: 52, airYardsShare: 0, pastPts: 358.0, opponent: 'WAS', opponentRank: 28, matchupGrade: 'A+', notes: 'Brotherly shove guarantees 10+ rushing TDs.', sleeperTag: null },
  { id: 'qb-3', name: 'Lamar Jackson', pos: 'QB', team: 'BAL', bye: 14, ecr: 23, customRank: 21, tier: 1, projectedPts: 355.8, floorPts: 17.5, ceilingPts: 31.8, targetShare: 0, redzoneTouches: 40, airYardsShare: 0, pastPts: 332.0, opponent: 'CIN', opponentRank: 20, matchupGrade: 'B+', notes: '2-time MVP with unmatched quarterback rushing upside.', sleeperTag: null },
  { id: 'qb-4', name: 'Patrick Mahomes', pos: 'QB', team: 'KC', bye: 6, ecr: 28, customRank: 25, tier: 2, projectedPts: 340.0, floorPts: 16.5, ceilingPts: 28.5, targetShare: 0, redzoneTouches: 22, airYardsShare: 0, pastPts: 295.4, opponent: 'LAC', opponentRank: 11, matchupGrade: 'B-', notes: 'Re-loaded receiving corps with Xavier Worthy & Rashee Rice.', sleeperTag: null },
  { id: 'te-1', name: 'Travis Kelce', pos: 'TE', team: 'KC', bye: 6, ecr: 20, customRank: 22, tier: 1, projectedPts: 210.0, floorPts: 10.2, ceilingPts: 21.0, targetShare: 22.5, redzoneTouches: 24, airYardsShare: 24.0, pastPts: 220.0, opponent: 'DEN', opponentRank: 27, matchupGrade: 'A', notes: 'The positional baseline cheat code.', sleeperTag: null },
  { id: 'te-2', name: 'Sam LaPorta', pos: 'TE', team: 'DET', bye: 5, ecr: 25, customRank: 23, tier: 1, projectedPts: 202.4, floorPts: 9.8, ceilingPts: 20.5, targetShare: 20.8, redzoneTouches: 22, airYardsShare: 21.5, pastPts: 225.3, opponent: 'MIN', opponentRank: 18, matchupGrade: 'B+', notes: 'Historic rookie TE season setup for major Year 2 follow-up.', sleeperTag: null },
  { id: 'te-3', name: 'Trey McBride', pos: 'TE', team: 'ARI', bye: 11, ecr: 29, customRank: 24, tier: 1, projectedPts: 195.0, floorPts: 9.5, ceilingPts: 19.8, targetShare: 24.2, redzoneTouches: 18, airYardsShare: 22.0, pastPts: 180.2, opponent: 'SF', opponentRank: 9, matchupGrade: 'C+', notes: 'Massive target rate once taking over starting job.', sleeperTag: 'SLEEPER' },
  { id: 'te-4', name: 'Mark Andrews', pos: 'TE', team: 'BAL', bye: 14, ecr: 32, customRank: 28, tier: 2, projectedPts: 185.0, floorPts: 8.8, ceilingPts: 19.0, targetShare: 21.0, redzoneTouches: 19, airYardsShare: 23.5, pastPts: 155.0, opponent: 'PIT', opponentRank: 12, matchupGrade: 'B', notes: 'Lamar Jackson primary red-zone target when healthy.', sleeperTag: null },
  { id: 'dst-1', name: 'San Francisco 49ers', pos: 'DST', team: 'SF', bye: 9, ecr: 110, customRank: 105, tier: 1, projectedPts: 135.0, floorPts: 6.0, ceilingPts: 16.0, targetShare: 0, redzoneTouches: 0, airYardsShare: 0, pastPts: 142.0, opponent: 'ARI', opponentRank: 22, matchupGrade: 'A', notes: 'Elite pass rush & turnovers.', sleeperTag: null },
  { id: 'dst-2', name: 'Baltimore Ravens', pos: 'DST', team: 'BAL', bye: 14, ecr: 112, customRank: 108, tier: 1, projectedPts: 132.0, floorPts: 6.0, ceilingPts: 15.5, targetShare: 0, redzoneTouches: 0, airYardsShare: 0, pastPts: 148.0, opponent: 'CLE', opponentRank: 28, matchupGrade: 'A+', notes: 'Heavy pressure rate.', sleeperTag: null },
  { id: 'k-1', name: 'Justin Tucker', pos: 'K', team: 'BAL', bye: 14, ecr: 130, customRank: 125, tier: 1, projectedPts: 150.0, floorPts: 7.0, ceilingPts: 15.0, targetShare: 0, redzoneTouches: 0, airYardsShare: 0, pastPts: 156.0, opponent: 'CLE', opponentRank: 15, matchupGrade: 'B+', notes: 'Most accurate kicker in NFL history.', sleeperTag: null },
  { id: 'k-2', name: 'Brandon Aubrey', pos: 'K', team: 'DAL', bye: 7, ecr: 132, customRank: 126, tier: 1, projectedPts: 148.0, floorPts: 7.0, ceilingPts: 16.0, targetShare: 0, redzoneTouches: 0, airYardsShare: 0, pastPts: 162.0, opponent: 'NYG', opponentRank: 20, matchupGrade: 'A', notes: '60+ yard range inside high scoring offense.', sleeperTag: null }
];

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

  // Check if players table is empty and seed default data
  const { rows } = await db.execute('SELECT COUNT(*) as count FROM players');
  if (rows[0].count === 0) {
    for (const p of INITIAL_PLAYERS) {
      await savePlayer(p);
    }
  }

  // Seed default user roster starters if empty
  const rosterCheck = await db.execute('SELECT COUNT(*) as count FROM user_roster');
  if (rosterCheck.rows[0].count === 0) {
    const defaultStarters = ['rb-1', 'wr-1', 'qb-1', 'te-1'];
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
  logNewsSync
};
