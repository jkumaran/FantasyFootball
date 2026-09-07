// 7 Core Analytical Pillars Data & Grading Provider
// Covers all 32 NFL teams + player-level efficiency, volume, and position-adjusted grades

export const TEAM_ANALYTICS = {
  DET: { impliedPpg: 27.2, neutralPassRate: 54, olRank: 1,  olGrade: 'Elite',      paceRank: 4,  paceLabel: '#4 Fast',    scheme: '11 Spread / Play-Action', playoffSos: 'A (Favorable)', seasonSos: 'B+', sosMult: 1.05 },
  KC:  { impliedPpg: 26.8, neutralPassRate: 64, olRank: 3,  olGrade: 'Elite',      paceRank: 3,  paceLabel: '#3 Fast',    scheme: '11 Spread / Up-Tempo',   playoffSos: 'A+ (Soft)',     seasonSos: 'A',  sosMult: 1.08 },
  SF:  { impliedPpg: 26.5, neutralPassRate: 49, olRank: 14, olGrade: 'Average',    paceRank: 22, paceLabel: '#22 Slow',   scheme: 'Shanahan Outside-Zone',  playoffSos: 'B (Neutral)',   seasonSos: 'B',  sosMult: 1.00 },
  PHI: { impliedPpg: 26.0, neutralPassRate: 51, olRank: 2,  olGrade: 'Elite',      paceRank: 9,  paceLabel: '#9 Fast',    scheme: 'Zone-Read / RPO',        playoffSos: 'B+ (Solid)',    seasonSos: 'B+', sosMult: 1.03 },
  BAL: { impliedPpg: 25.8, neutralPassRate: 48, olRank: 8,  olGrade: 'Strong',     paceRank: 18, paceLabel: '#18 Neutral',scheme: 'Power-Gap / Multi-TE',   playoffSos: 'B (Neutral)',   seasonSos: 'B',  sosMult: 1.00 },
  CIN: { impliedPpg: 25.2, neutralPassRate: 63, olRank: 16, olGrade: 'Average',    paceRank: 10, paceLabel: '#10 Fast',   scheme: '11 Personnel Spread',    playoffSos: 'A (Favorable)', seasonSos: 'A-', sosMult: 1.05 },
  BUF: { impliedPpg: 24.8, neutralPassRate: 59, olRank: 13, olGrade: 'Average',    paceRank: 5,  paceLabel: '#5 Fast',    scheme: 'Dual-Threat / Spread',   playoffSos: 'B+ (Solid)',    seasonSos: 'B',  sosMult: 1.03 },
  MIA: { impliedPpg: 24.5, neutralPassRate: 62, olRank: 18, olGrade: 'Average',    paceRank: 11, paceLabel: '#11 Fast',   scheme: 'Motion-Heavy Outside-Zone',playoffSos: 'A+ (Soft)',   seasonSos: 'A',  sosMult: 1.08 },
  HOU: { impliedPpg: 24.2, neutralPassRate: 55, olRank: 15, olGrade: 'Average',    paceRank: 7,  paceLabel: '#7 Fast',    scheme: 'Slowik West-Coast Spread',playoffSos: 'B (Neutral)',  seasonSos: 'B+', sosMult: 1.00 },
  GB:  { impliedPpg: 23.8, neutralPassRate: 52, olRank: 7,  olGrade: 'Strong',     paceRank: 8,  paceLabel: '#8 Fast',    scheme: 'LaFleur Motion Spread',  playoffSos: 'B+ (Solid)',    seasonSos: 'B',  sosMult: 1.03 },
  LAR: { impliedPpg: 23.5, neutralPassRate: 54, olRank: 10, olGrade: 'Strong',     paceRank: 17, paceLabel: '#17 Neutral',scheme: 'McVay 11-Personnel Zone',playoffSos: 'B (Neutral)',  seasonSos: 'B-', sosMult: 1.00 },
  DAL: { impliedPpg: 23.2, neutralPassRate: 58, olRank: 17, olGrade: 'Average',    paceRank: 2,  paceLabel: '#2 Fast',    scheme: 'Texas Coast Pass-First', playoffSos: 'B- (Tough)',    seasonSos: 'B',  sosMult: 0.98 },
  ATL: { impliedPpg: 22.8, neutralPassRate: 46, olRank: 5,  olGrade: 'Elite',      paceRank: 28, paceLabel: '#28 Slow',   scheme: 'Robinson/Morris Zone-Run',playoffSos: 'A+ (Soft)',    seasonSos: 'A',  sosMult: 1.08 },
  MIN: { impliedPpg: 22.5, neutralPassRate: 57, olRank: 9,  olGrade: 'Strong',     paceRank: 12, paceLabel: '#12 Fast',   scheme: 'O\'Connell 11 Spread',   playoffSos: 'B (Neutral)',   seasonSos: 'B',  sosMult: 1.00 },
  ARI: { impliedPpg: 22.2, neutralPassRate: 52, olRank: 21, olGrade: 'Average',    paceRank: 6,  paceLabel: '#6 Fast',    scheme: 'Petzing Multi-TE Run/RPO',playoffSos: 'B+ (Solid)',   seasonSos: 'B-', sosMult: 1.03 },
  CHI: { impliedPpg: 22.0, neutralPassRate: 53, olRank: 11, olGrade: 'Strong',     paceRank: 14, paceLabel: '#14 Neutral',scheme: 'Waldron 3-WR Spread',   playoffSos: 'A (Favorable)', seasonSos: 'B+', sosMult: 1.05 },
  TB:  { impliedPpg: 21.8, neutralPassRate: 53, olRank: 19, olGrade: 'Average',    paceRank: 13, paceLabel: '#13 Neutral',scheme: 'Coen Balanced Attack',   playoffSos: 'B (Neutral)',   seasonSos: 'B',  sosMult: 1.00 },
  IND: { impliedPpg: 21.5, neutralPassRate: 49, olRank: 6,  olGrade: 'Strong',     paceRank: 1,  paceLabel: '#1 Lightning',scheme: 'Steichen Zone-Read RPO', playoffSos: 'B+ (Solid)',   seasonSos: 'B+', sosMult: 1.03 },
  JAX: { impliedPpg: 21.2, neutralPassRate: 51, olRank: 20, olGrade: 'Average',    paceRank: 16, paceLabel: '#16 Neutral',scheme: 'Pederson Pass-Heavy RPO',playoffSos: 'B (Neutral)',   seasonSos: 'B',  sosMult: 1.00 },
  WAS: { impliedPpg: 20.8, neutralPassRate: 50, olRank: 26, olGrade: 'Vulnerable', paceRank: 15, paceLabel: '#15 Neutral',scheme: 'Kingsbury Air-Raid Spread',playoffSos: 'B+ (Solid)', seasonSos: 'B-', sosMult: 1.03 },
  SEA: { impliedPpg: 20.5, neutralPassRate: 56, olRank: 24, olGrade: 'Vulnerable', paceRank: 19, paceLabel: '#19 Neutral',scheme: 'Grubb Deep Passing',    playoffSos: 'C (Tough)',     seasonSos: 'C+', sosMult: 0.96 },
  CLE: { impliedPpg: 20.2, neutralPassRate: 60, olRank: 4,  olGrade: 'Elite',      paceRank: 20, paceLabel: '#20 Neutral',scheme: 'Stefanski Multi-Tight End',playoffSos: 'C (Tough)',   seasonSos: 'C',  sosMult: 0.96 },
  LAC: { impliedPpg: 19.8, neutralPassRate: 47, olRank: 22, olGrade: 'Vulnerable', paceRank: 21, paceLabel: '#21 Neutral',scheme: 'Harbaugh Ground & Pound',playoffSos: 'B (Neutral)',   seasonSos: 'B',  sosMult: 1.00 },
  PIT: { impliedPpg: 19.5, neutralPassRate: 43, olRank: 23, olGrade: 'Vulnerable', paceRank: 31, paceLabel: '#31 Slow',   scheme: 'Arthur Smith Heavy 12 Run',playoffSos: 'C (Tough)',   seasonSos: 'C',  sosMult: 0.96 },
  NO:  { impliedPpg: 19.2, neutralPassRate: 45, olRank: 28, olGrade: 'Vulnerable', paceRank: 24, paceLabel: '#24 Neutral',scheme: 'Kubiak Outside-Zone Boot',playoffSos: 'A (Favorable)',seasonSos: 'B+', sosMult: 1.05 },
  NYJ: { impliedPpg: 18.8, neutralPassRate: 48, olRank: 12, olGrade: 'Strong',     paceRank: 23, paceLabel: '#23 Neutral',scheme: 'Downfield West-Coast',   playoffSos: 'B+ (Solid)',    seasonSos: 'B',  sosMult: 1.03 },
  LV:  { impliedPpg: 18.5, neutralPassRate: 46, olRank: 27, olGrade: 'Vulnerable', paceRank: 29, paceLabel: '#29 Slow',   scheme: 'Getsy Balanced Run-First',playoffSos: 'C- (Tough)',  seasonSos: 'C',  sosMult: 0.95 },
  DEN: { impliedPpg: 18.2, neutralPassRate: 48, olRank: 25, olGrade: 'Vulnerable', paceRank: 26, paceLabel: '#26 Slow',   scheme: 'Payton Timing Screen Pass',playoffSos: 'C (Tough)',  seasonSos: 'C',  sosMult: 0.96 },
  TEN: { impliedPpg: 17.8, neutralPassRate: 45, olRank: 29, olGrade: 'Poor',       paceRank: 27, paceLabel: '#27 Slow',   scheme: 'Callahan Up-Tempo Pass', playoffSos: 'B (Neutral)',   seasonSos: 'B-', sosMult: 1.00 },
  NYG: { impliedPpg: 17.5, neutralPassRate: 44, olRank: 30, olGrade: 'Poor',       paceRank: 25, paceLabel: '#25 Slow',   scheme: 'Daboll Spread Run-Option',playoffSos: 'D (Brutal)',  seasonSos: 'C-', sosMult: 0.92 },
  CAR: { impliedPpg: 17.2, neutralPassRate: 42, olRank: 31, olGrade: 'Poor',       paceRank: 30, paceLabel: '#30 Slow',   scheme: 'Canales Quick-Game Pass',playoffSos: 'C (Tough)',     seasonSos: 'C',  sosMult: 0.96 },
  NE:  { impliedPpg: 17.0, neutralPassRate: 42, olRank: 32, olGrade: 'Poor',       paceRank: 32, paceLabel: '#32 Slow',   scheme: 'Van Pelt Conservative Run',playoffSos: 'D (Brutal)', seasonSos: 'D',  sosMult: 0.92 },
};

export const DEFAULT_TEAM_ANALYTICS = {
  impliedPpg: 21.0,
  neutralPassRate: 50,
  olRank: 16,
  olGrade: 'Average',
  paceRank: 16,
  paceLabel: '#16 Neutral',
  scheme: 'Standard Multiple',
  playoffSos: 'B (Neutral)',
  seasonSos: 'B',
  sosMult: 1.00
};

const NOTABLE_EFFICIENCY = {
  'Justin Jefferson': { yprr: 2.95, explRun: null, ypa: null, oppShare: null },
  'Ja\'Marr Chase': { yprr: 2.75, explRun: null, ypa: null, oppShare: null },
  'CeeDee Lamb': { yprr: 2.65, explRun: null, ypa: null, oppShare: null },
  'Amon-Ra St. Brown': { yprr: 2.45, explRun: null, ypa: null, oppShare: null },
  'Tyreek Hill': { yprr: 2.42, explRun: null, ypa: null, oppShare: null },
  'Nico Collins': { yprr: 2.55, explRun: null, ypa: null, oppShare: null },
  'A.J. Brown': { yprr: 2.38, explRun: null, ypa: null, oppShare: null },
  'Malik Nabers': { yprr: 2.30, explRun: null, ypa: null, oppShare: null },
  'Marvin Harrison Jr.': { yprr: 2.18, explRun: null, ypa: null, oppShare: null },
  'Drake London': { yprr: 2.15, explRun: null, ypa: null, oppShare: null },
  'Brock Bowers': { yprr: 2.25, explRun: null, ypa: null, oppShare: null },
  'Trey McBride': { yprr: 2.12, explRun: null, ypa: null, oppShare: null },
  'George Kittle': { yprr: 2.22, explRun: null, ypa: null, oppShare: null },
  'Travis Kelce': { yprr: 2.05, explRun: null, ypa: null, oppShare: null },
  'Sam LaPorta': { yprr: 1.95, explRun: null, ypa: null, oppShare: null },

  'Jahmyr Gibbs': { yprr: null, explRun: 15.2, ypa: null, oppShare: 64 },
  'Bijan Robinson': { yprr: null, explRun: 12.8, ypa: null, oppShare: 74 },
  'Christian McCaffrey': { yprr: null, explRun: 10.8, ypa: null, oppShare: 80 },
  'Saquon Barkley': { yprr: null, explRun: 11.2, ypa: null, oppShare: 76 },
  'Breece Hall': { yprr: null, explRun: 11.6, ypa: null, oppShare: 72 },
  'De\'Von Achane': { yprr: null, explRun: 14.5, ypa: null, oppShare: 62 },
  'Jonathan Taylor': { yprr: null, explRun: 10.5, ypa: null, oppShare: 75 },
  'Derrick Henry': { yprr: null, explRun: 10.2, ypa: null, oppShare: 72 },
  'Kyren Williams': { yprr: null, explRun: 9.4, ypa: null, oppShare: 78 },
  'Kenneth Walker III': { yprr: null, explRun: 11.0, ypa: null, oppShare: 66 },
  'James Cook': { yprr: null, explRun: 11.4, ypa: null, oppShare: 63 },
  'Josh Jacobs': { yprr: null, explRun: 9.8, ypa: null, oppShare: 72 },
  'Alvin Kamara': { yprr: null, explRun: 8.9, ypa: null, oppShare: 70 },
  'Joe Mixon': { yprr: null, explRun: 8.8, ypa: null, oppShare: 71 },

  'Josh Allen': { yprr: null, explRun: null, ypa: 7.8, oppShare: null },
  'Lamar Jackson': { yprr: null, explRun: null, ypa: 8.1, oppShare: null },
  'Jalen Hurts': { yprr: null, explRun: null, ypa: 7.3, oppShare: null },
  'Patrick Mahomes': { yprr: null, explRun: null, ypa: 7.5, oppShare: null },
  'Brock Purdy': { yprr: null, explRun: null, ypa: 8.4, oppShare: null },
  'C.J. Stroud': { yprr: null, explRun: null, ypa: 7.7, oppShare: null },
  'Joe Burrow': { yprr: null, explRun: null, ypa: 7.4, oppShare: null },
  'Jayden Daniels': { yprr: null, explRun: null, ypa: 7.4, oppShare: null },
  'Jordan Love': { yprr: null, explRun: null, ypa: 7.3, oppShare: null },
  'Kyler Murray': { yprr: null, explRun: null, ypa: 7.1, oppShare: null },
};

/**
 * Calculates letter grade (A+ to F) from a 0-100 normalized score
 */
function scoreToGrade(score) {
  if (score >= 92) return 'A+';
  if (score >= 82) return 'A';
  if (score >= 72) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 48) return 'C+';
  if (score >= 35) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

export function getPlayerAnalytics(player) {
  const teamInfo = TEAM_ANALYTICS[player.team] || DEFAULT_TEAM_ANALYTICS;
  const notable = NOTABLE_EFFICIENCY[player.name];
  const pos = player.pos || 'FLEX';
  const projPpg = +((player.projectedPts || 0) / 17).toFixed(1);
  const lastYrPpg = +((player.pastPts || 0) / 17).toFixed(1);

  // --- PILLAR 1: Volume & Opportunity Share ---
  let oppShare = 0;
  let p1Score = 0;
  const rz = player.redzoneTouches || 0;

  if (pos === 'RB') {
    if (notable && notable.oppShare) {
      oppShare = notable.oppShare;
    } else {
      oppShare = Math.min(82, Math.max(30, Math.round(projPpg * 4.4)));
    }
    // RB score: oppShare (65%) + RZ touches (35%)
    p1Score = Math.min(99, Math.round((oppShare / 80) * 65 + (Math.min(22, rz) / 22) * 35));
  } else if (pos === 'WR' || pos === 'TE') {
    const tgtShare = player.targetShare || 0;
    const airShare = player.airYardsShare || (tgtShare * 1.1);
    oppShare = Math.round((1.5 * tgtShare + 0.7 * airShare) / 2.2);
    // WR/TE score: targetShare (60%) + airShare (25%) + RZ (15%)
    p1Score = Math.min(99, Math.round((tgtShare / 28) * 60 + (airShare / 35) * 25 + (Math.min(14, rz) / 14) * 15));
  } else if (pos === 'QB') {
    // QB volume based on dual threat rush + pass projected
    const dualThreats = ['Josh Allen', 'Lamar Jackson', 'Jalen Hurts', 'Jayden Daniels', 'Kyler Murray', 'Anthony Richardson'];
    const isDual = dualThreats.some(dt => (player.name || '').includes(dt));
    p1Score = isDual ? 94 : Math.min(92, Math.round((projPpg / 23) * 88));
    oppShare = Math.round(p1Score * 0.75);
  } else {
    // Specialists (DST/K)
    p1Score = Math.max(30, 95 - (player.tier || 1) * 12);
    oppShare = p1Score;
  }
  const gradeP1 = scoreToGrade(p1Score);

  // --- PILLAR 2: Per-Game Efficiency (Combine YPRR / Expl Run% / YPA + Proj PPG) ---
  let effLabel = '';
  let effVal = 0;
  let p2Score = 0;

  if (pos === 'WR' || pos === 'TE') {
    if (notable && notable.yprr) {
      effVal = notable.yprr;
    } else {
      effVal = +(1.1 + (projPpg / 18) * 1.3).toFixed(2);
    }
    effLabel = `${effVal} YPRR`;
    p2Score = Math.min(99, Math.round((effVal / 2.85) * 60 + (projPpg / 17) * 40));
  } else if (pos === 'RB') {
    if (notable && notable.explRun) {
      effVal = notable.explRun;
    } else {
      effVal = +(7.5 + (projPpg / 18) * 5.0).toFixed(1);
    }
    effLabel = `${effVal}% Expl`;
    p2Score = Math.min(99, Math.round((effVal / 14.5) * 55 + (projPpg / 17) * 45));
  } else if (pos === 'QB') {
    if (notable && notable.ypa) {
      effVal = notable.ypa;
    } else {
      effVal = +(6.5 + (projPpg / 25) * 1.5).toFixed(1);
    }
    effLabel = `${effVal} YPA`;
    p2Score = Math.min(99, Math.round((effVal / 8.2) * 50 + (projPpg / 24) * 50));
  } else {
    effLabel = '-';
    p2Score = Math.max(30, 92 - (player.tier || 1) * 11);
  }
  const gradeP2 = scoreToGrade(p2Score);

  // --- PILLAR 3: Offensive Environment (Position-Adjusted) ---
  // WR/QB/TE favor high implied points + high pass rate; RB favor high points + positive run script
  let p3Score = 0;
  if (pos === 'RB') {
    // RB: High team PPG (60%) + run game script (40%)
    p3Score = Math.min(99, Math.round(((teamInfo.impliedPpg - 16) / 11.5) * 65 + ((60 - teamInfo.neutralPassRate) / 20) * 35));
  } else if (pos === 'WR' || pos === 'QB' || pos === 'TE') {
    // WR/QB: High team PPG (55%) + high pass rate (45%)
    p3Score = Math.min(99, Math.round(((teamInfo.impliedPpg - 16) / 11.5) * 55 + ((teamInfo.neutralPassRate - 40) / 24) * 45));
  } else {
    // Specialists
    p3Score = Math.min(99, Math.round(((teamInfo.impliedPpg - 16) / 11.5) * 90));
  }
  const gradeP3 = scoreToGrade(p3Score);

  // --- PILLAR 4: Offensive Line Rankings (Position-Adjusted) ---
  // RBs depend on run block push; QBs/WRs depend on pass protection pocket time
  let p4Score = 0;
  const olRank = teamInfo.olRank || 16;
  if (pos === 'RB') {
    // Top run blocking lines: DET(1), PHI(2), BAL(8), ATL(5), CLE(4), IND(6), GB(7)
    const runBonus = [1, 2, 4, 5, 6, 7, 8].includes(olRank) ? 10 : 0;
    p4Score = Math.min(99, Math.max(15, Math.round((33 - olRank) * 3.0 + runBonus)));
  } else if (pos === 'WR' || pos === 'QB') {
    // Pass blocking pocket stability
    const passBonus = [1, 2, 3, 9, 11, 12].includes(olRank) ? 10 : 0;
    p4Score = Math.min(99, Math.max(15, Math.round((33 - olRank) * 3.0 + passBonus)));
  } else {
    p4Score = Math.min(99, Math.max(15, Math.round((33 - olRank) * 3.0)));
  }
  const gradeP4 = scoreToGrade(p4Score);

  // --- PILLAR 5: Coaching & Play-Calling Trends (Position-Adjusted) ---
  // WR/QB favor fast tempo & 11 spread; RBs favor outside-zone/gap commitment; TEs favor multi-TE sets
  let p5Score = 0;
  const pace = teamInfo.paceRank || 16;
  if (pos === 'RB') {
    const runCommitTeams = ['DET', 'BAL', 'SF', 'PHI', 'ATL', 'CLE', 'IND', 'GB', 'NO', 'LAR'];
    const isRunCommit = runCommitTeams.includes(player.team);
    p5Score = isRunCommit ? Math.min(98, 88 + Math.round((16 - pace) * 0.8)) : Math.max(25, 65 - Math.round((pace - 16) * 1.8));
  } else if (pos === 'WR' || pos === 'QB') {
    const spreadTeams = ['KC', 'CIN', 'MIA', 'BUF', 'HOU', 'GB', 'MIN', 'CHI', 'DAL', 'SEA', 'DET', 'IND'];
    const isSpread = spreadTeams.includes(player.team);
    p5Score = isSpread ? Math.min(98, 86 + Math.round((16 - pace) * 1.0)) : Math.max(25, 60 - Math.round((pace - 16) * 1.5));
  } else if (pos === 'TE') {
    const teHeavy = ['ARI', 'BAL', 'CLE', 'KC', 'SF', 'GB', 'DET', 'BUF', 'DAL', 'PHI'];
    p5Score = teHeavy.includes(player.team) ? 92 : Math.max(30, 65 - Math.round((pace - 16) * 1.2));
  } else {
    p5Score = Math.max(30, Math.round((33 - pace) * 2.8));
  }
  const gradeP5 = scoreToGrade(p5Score);

  // --- PILLAR 6: Strength of Schedule & Playoff SoS (Weeks 15-17 Combined Points) ---
  const mult = teamInfo.sosMult || 1.0;
  const playoffPts = +(3 * projPpg * mult).toFixed(1);
  let p6Score = 0;
  if (mult >= 1.08) p6Score = 95;      // A+ (Soft)
  else if (mult >= 1.05) p6Score = 88; // A (Favorable)
  else if (mult >= 1.03) p6Score = 78; // B+ (Solid)
  else if (mult >= 0.99) p6Score = 68; // B (Neutral)
  else if (mult >= 0.95) p6Score = 48; // C (Tough)
  else p6Score = 25;                  // D / F (Brutal)
  const gradeP6 = scoreToGrade(p6Score);

  // --- PILLAR 7: Last Year's PPG Stats (Historical Baseline) ---
  let p7Score = 0;
  if (lastYrPpg >= 18.0) p7Score = 96;
  else if (lastYrPpg >= 15.0) p7Score = 86;
  else if (lastYrPpg >= 12.5) p7Score = 76;
  else if (lastYrPpg >= 10.0) p7Score = 64;
  else if (lastYrPpg >= 8.0)  p7Score = 50;
  else if (lastYrPpg >= 6.0)  p7Score = 38;
  else if (lastYrPpg >= 4.0)  p7Score = 24;
  else if (lastYrPpg > 0)    p7Score = 15;
  else p7Score = 60; // Rookie / no last year data default to average
  const gradeP7 = (lastYrPpg === 0) ? 'R' : scoreToGrade(p7Score);

  return {
    // Individual Metric Values
    oppShare,
    oppShareLabel: `${oppShare}%`,
    targetShare: player.targetShare || 0,
    rzTouches: player.redzoneTouches || 0,
    projPpg,
    effLabel,
    effVal,
    impliedPpg: teamInfo.impliedPpg,
    neutralPassRate: teamInfo.neutralPassRate,
    olRank: teamInfo.olRank,
    olGrade: teamInfo.olGrade,
    paceRank: teamInfo.paceRank,
    paceLabel: teamInfo.paceLabel,
    scheme: teamInfo.scheme,
    playoffSos: teamInfo.playoffSos,
    playoffPts,
    seasonSos: teamInfo.seasonSos,
    lastYrPpg,

    // 7 Core Analytical Pillar Grades
    gradeP1,
    gradeP2,
    gradeP3,
    gradeP4,
    gradeP5,
    gradeP6,
    gradeP7,
  };
}
