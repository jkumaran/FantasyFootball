// 6 Core Analytical Pillars Data Provider
// Covers all 32 NFL teams + player-level efficiency & opportunity metrics

export const TEAM_ANALYTICS = {
  DET: { impliedPpg: 27.2, neutralPassRate: 54, olRank: 1,  olGrade: 'Elite',      paceRank: 4,  paceLabel: '#4 Fast',    scheme: '11 Spread / Play-Action', playoffSos: 'A (Favorable)', seasonSos: 'B+' },
  KC:  { impliedPpg: 26.8, neutralPassRate: 64, olRank: 3,  olGrade: 'Elite',      paceRank: 3,  paceLabel: '#3 Fast',    scheme: '11 Spread / Up-Tempo',   playoffSos: 'A+ (Soft)',     seasonSos: 'A' },
  SF:  { impliedPpg: 26.5, neutralPassRate: 49, olRank: 14, olGrade: 'Average',    paceRank: 22, paceLabel: '#22 Slow',   scheme: 'Shanahan Outside-Zone',  playoffSos: 'B (Neutral)',   seasonSos: 'B' },
  PHI: { impliedPpg: 26.0, neutralPassRate: 51, olRank: 2,  olGrade: 'Elite',      paceRank: 9,  paceLabel: '#9 Fast',    scheme: 'Zone-Read / RPO',        playoffSos: 'B+ (Solid)',    seasonSos: 'B+' },
  BAL: { impliedPpg: 25.8, neutralPassRate: 48, olRank: 8,  olGrade: 'Strong',     paceRank: 18, paceLabel: '#18 Neutral',scheme: 'Power-Gap / Multi-TE',   playoffSos: 'B (Neutral)',   seasonSos: 'B' },
  CIN: { impliedPpg: 25.2, neutralPassRate: 63, olRank: 16, olGrade: 'Average',    paceRank: 10, paceLabel: '#10 Fast',   scheme: '11 Personnel Spread',    playoffSos: 'A (Favorable)', seasonSos: 'A-' },
  BUF: { impliedPpg: 24.8, neutralPassRate: 59, olRank: 13, olGrade: 'Average',    paceRank: 5,  paceLabel: '#5 Fast',    scheme: 'Dual-Threat / Spread',   playoffSos: 'B+ (Solid)',    seasonSos: 'B' },
  MIA: { impliedPpg: 24.5, neutralPassRate: 62, olRank: 18, olGrade: 'Average',    paceRank: 11, paceLabel: '#11 Fast',   scheme: 'Motion-Heavy Outside-Zone',playoffSos: 'A+ (Soft)',   seasonSos: 'A' },
  HOU: { impliedPpg: 24.2, neutralPassRate: 55, olRank: 15, olGrade: 'Average',    paceRank: 7,  paceLabel: '#7 Fast',    scheme: 'Slowik West-Coast Spread',playoffSos: 'B (Neutral)',  seasonSos: 'B+' },
  GB:  { impliedPpg: 23.8, neutralPassRate: 52, olRank: 7,  olGrade: 'Strong',     paceRank: 8,  paceLabel: '#8 Fast',    scheme: 'LaFleur Motion Spread',  playoffSos: 'B+ (Solid)',    seasonSos: 'B' },
  LAR: { impliedPpg: 23.5, neutralPassRate: 54, olRank: 10, olGrade: 'Strong',     paceRank: 17, paceLabel: '#17 Neutral',scheme: 'McVay 11-Personnel Zone',playoffSos: 'B (Neutral)',  seasonSos: 'B-' },
  DAL: { impliedPpg: 23.2, neutralPassRate: 58, olRank: 17, olGrade: 'Average',    paceRank: 2,  paceLabel: '#2 Fast',    scheme: 'Texas Coast Pass-First', playoffSos: 'B- (Tough)',    seasonSos: 'B' },
  ATL: { impliedPpg: 22.8, neutralPassRate: 46, olRank: 5,  olGrade: 'Elite',      paceRank: 28, paceLabel: '#28 Slow',   scheme: 'Robinson/Morris Zone-Run',playoffSos: 'A+ (Soft)',    seasonSos: 'A' },
  MIN: { impliedPpg: 22.5, neutralPassRate: 57, olRank: 9,  olGrade: 'Strong',     paceRank: 12, paceLabel: '#12 Fast',   scheme: 'O\'Connell 11 Spread',   playoffSos: 'B (Neutral)',   seasonSos: 'B' },
  ARI: { impliedPpg: 22.2, neutralPassRate: 52, olRank: 21, olGrade: 'Average',    paceRank: 6,  paceLabel: '#6 Fast',    scheme: 'Petzing Multi-TE Run/RPO',playoffSos: 'B+ (Solid)',   seasonSos: 'B-' },
  CHI: { impliedPpg: 22.0, neutralPassRate: 53, olRank: 11, olGrade: 'Strong',     paceRank: 14, paceLabel: '#14 Neutral',scheme: 'Waldron 3-WR Spread',   playoffSos: 'A (Favorable)', seasonSos: 'B+' },
  TB:  { impliedPpg: 21.8, neutralPassRate: 53, olRank: 19, olGrade: 'Average',    paceRank: 13, paceLabel: '#13 Neutral',scheme: 'Coen Balanced Attack',   playoffSos: 'B (Neutral)',   seasonSos: 'B' },
  IND: { impliedPpg: 21.5, neutralPassRate: 49, olRank: 6,  olGrade: 'Strong',     paceRank: 1,  paceLabel: '#1 Lightning',scheme: 'Steichen Zone-Read RPO', playoffSos: 'B+ (Solid)',   seasonSos: 'B+' },
  JAX: { impliedPpg: 21.2, neutralPassRate: 51, olRank: 20, olGrade: 'Average',    paceRank: 16, paceLabel: '#16 Neutral',scheme: 'Pederson Pass-Heavy RPO',playoffSos: 'B (Neutral)',   seasonSos: 'B' },
  WAS: { impliedPpg: 20.8, neutralPassRate: 50, olRank: 26, olGrade: 'Vulnerable', paceRank: 15, paceLabel: '#15 Neutral',scheme: 'Kingsbury Air-Raid Spread',playoffSos: 'B+ (Solid)', seasonSos: 'B-' },
  SEA: { impliedPpg: 20.5, neutralPassRate: 56, olRank: 24, olGrade: 'Vulnerable', paceRank: 19, paceLabel: '#19 Neutral',scheme: 'Grubb Deep Passing',    playoffSos: 'C (Tough)',     seasonSos: 'C+' },
  CLE: { impliedPpg: 20.2, neutralPassRate: 60, olRank: 4,  olGrade: 'Elite',      paceRank: 20, paceLabel: '#20 Neutral',scheme: 'Stefanski Multi-Tight End',playoffSos: 'C (Tough)',   seasonSos: 'C' },
  LAC: { impliedPpg: 19.8, neutralPassRate: 47, olRank: 22, olGrade: 'Vulnerable', paceRank: 21, paceLabel: '#21 Neutral',scheme: 'Harbaugh Ground & Pound',playoffSos: 'B (Neutral)',   seasonSos: 'B' },
  PIT: { impliedPpg: 19.5, neutralPassRate: 43, olRank: 23, olGrade: 'Vulnerable', paceRank: 31, paceLabel: '#31 Slow',   scheme: 'Arthur Smith Heavy 12 Run',playoffSos: 'C (Tough)',   seasonSos: 'C' },
  NO:  { impliedPpg: 19.2, neutralPassRate: 45, olRank: 28, olGrade: 'Vulnerable', paceRank: 24, paceLabel: '#24 Neutral',scheme: 'Kubiak Outside-Zone Boot',playoffSos: 'A (Favorable)',seasonSos: 'B+' },
  NYJ: { impliedPpg: 18.8, neutralPassRate: 48, olRank: 12, olGrade: 'Strong',     paceRank: 23, paceLabel: '#23 Neutral',scheme: 'Downfield West-Coast',   playoffSos: 'B+ (Solid)',    seasonSos: 'B' },
  LV:  { impliedPpg: 18.5, neutralPassRate: 46, olRank: 27, olGrade: 'Vulnerable', paceRank: 29, paceLabel: '#29 Slow',   scheme: 'Getsy Balanced Run-First',playoffSos: 'C- (Tough)',  seasonSos: 'C' },
  DEN: { impliedPpg: 18.2, neutralPassRate: 48, olRank: 25, olGrade: 'Vulnerable', paceRank: 26, paceLabel: '#26 Slow',   scheme: 'Payton Timing Screen Pass',playoffSos: 'C (Tough)',  seasonSos: 'C' },
  TEN: { impliedPpg: 17.8, neutralPassRate: 45, olRank: 29, olGrade: 'Poor',       paceRank: 27, paceLabel: '#27 Slow',   scheme: 'Callahan Up-Tempo Pass', playoffSos: 'B (Neutral)',   seasonSos: 'B-' },
  NYG: { impliedPpg: 17.5, neutralPassRate: 44, olRank: 30, olGrade: 'Poor',       paceRank: 25, paceLabel: '#25 Slow',   scheme: 'Daboll Spread Run-Option',playoffSos: 'D (Brutal)',  seasonSos: 'C-' },
  CAR: { impliedPpg: 17.2, neutralPassRate: 42, olRank: 31, olGrade: 'Poor',       paceRank: 30, paceLabel: '#30 Slow',   scheme: 'Canales Quick-Game Pass',playoffSos: 'C (Tough)',     seasonSos: 'C' },
  NE:  { impliedPpg: 17.0, neutralPassRate: 42, olRank: 32, olGrade: 'Poor',       paceRank: 32, paceLabel: '#32 Slow',   scheme: 'Van Pelt Conservative Run',playoffSos: 'D (Brutal)', seasonSos: 'D' },
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
  seasonSos: 'B'
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

export function getPlayerAnalytics(player) {
  const teamInfo = TEAM_ANALYTICS[player.team] || DEFAULT_TEAM_ANALYTICS;
  const notable = NOTABLE_EFFICIENCY[player.name];

  let oppShare = 0;
  if (player.pos === 'RB') {
    if (notable && notable.oppShare) {
      oppShare = notable.oppShare;
    } else {
      const ppg = (player.projectedPts || 170) / 17;
      oppShare = Math.min(82, Math.max(30, Math.round(ppg * 4.4)));
    }
  } else {
    const tgtShare = player.targetShare || 0;
    const airShare = player.airYardsShare || (tgtShare * 1.1);
    oppShare = Math.round((1.5 * tgtShare + 0.7 * airShare) / 2.2);
  }

  let effLabel = '';
  let effVal = 0;
  if (player.pos === 'WR' || player.pos === 'TE') {
    if (notable && notable.yprr) {
      effVal = notable.yprr;
    } else {
      const ppg = (player.projectedPts || 170) / 17;
      effVal = +(1.1 + (ppg / 18) * 1.3).toFixed(2);
    }
    effLabel = `${effVal} YPRR`;
  } else if (player.pos === 'RB') {
    if (notable && notable.explRun) {
      effVal = notable.explRun;
    } else {
      const ppg = (player.projectedPts || 170) / 17;
      effVal = +(7.5 + (ppg / 18) * 5.0).toFixed(1);
    }
    effLabel = `${effVal}% Expl`;
  } else if (player.pos === 'QB') {
    if (notable && notable.ypa) {
      effVal = notable.ypa;
    } else {
      const ppg = (player.projectedPts || 250) / 17;
      effVal = +(6.5 + (ppg / 25) * 1.5).toFixed(1);
    }
    effLabel = `${effVal} YPA`;
  } else {
    effLabel = '-';
  }

  return {
    oppShare,
    oppShareLabel: player.pos === 'RB' ? `${oppShare}%` : `${oppShare}%`,
    targetShare: player.targetShare || 0,
    rzTouches: player.redzoneTouches || 0,
    projPpg: +((player.projectedPts || 0) / 17).toFixed(1),
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
    seasonSos: teamInfo.seasonSos,
  };
}
