/**
 * Weekly Matchup & Start/Sit Optimizer Engine
 * Supports Conservative vs Aggressive strategy modes and Waiver Wire Recommendations.
 */

export function optimizeWeeklyLineup(state) {
  const { players, userRoster, opponentProjected, weeklyStrategy } = state;
  
  // Get all players on user's team
  const userTeamPlayers = players.filter(p => userRoster.includes(p.id));

  // Compute effective player score based on Strategy Mode
  const evaluatedPlayers = userTeamPlayers.map(p => {
    let effectiveScore = p.projectedPts / 17; // Weekly avg base
    let floor = p.floorPts || (effectiveScore * 0.7);
    let ceiling = p.ceilingPts || (effectiveScore * 1.4);

    if (weeklyStrategy === 'CONSERVATIVE') {
      // Prioritize High Floor / Low Risk
      effectiveScore = 0.7 * floor + 0.3 * effectiveScore;
    } else {
      // Prioritize High Ceiling / Upside (Aggressive)
      effectiveScore = 0.7 * ceiling + 0.3 * effectiveScore;
    }

    return {
      ...p,
      weeklyProj: Math.round((p.projectedPts / 17) * 10) / 10,
      weeklyFloor: Math.round(floor * 10) / 10,
      weeklyCeiling: Math.round(ceiling * 10) / 10,
      effectiveScore: Math.round(effectiveScore * 10) / 10
    };
  });

  // Sort candidates per position by effective score
  const getTop = (pos, count) => {
    return evaluatedPlayers
      .filter(p => p.pos === pos)
      .sort((a, b) => b.effectiveScore - a.effectiveScore)
      .slice(0, count);
  };

  const startingQb = getTop('QB', 1);
  const startingRbs = getTop('RB', 2);
  const startingWrs = getTop('WR', 2);
  const startingTe = getTop('TE', 1);
  const startingDst = getTop('DST', 1);
  const startingK = getTop('K', 1);

  // Remaining RBs/WRs/TEs eligible for FLEX
  const startersSet = new Set([
    ...startingQb, ...startingRbs, ...startingWrs, ...startingTe, ...startingDst, ...startingK
  ].map(p => p.id));

  const flexCandidates = evaluatedPlayers
    .filter(p => ['RB', 'WR', 'TE'].includes(p.pos) && !startersSet.has(p.id))
    .sort((a, b) => b.effectiveScore - a.effectiveScore);

  const startingFlex = flexCandidates.slice(0, 1);
  if (startingFlex.length > 0) {
    startersSet.add(startingFlex[0].id);
  }

  // Bench players
  const bench = evaluatedPlayers.filter(p => !startersSet.has(p.id));

  const optimalStarters = [
    ...startingQb, ...startingRbs, ...startingWrs, ...startingTe, ...startingFlex, ...startingDst, ...startingK
  ];

  // Total Team Metrics
  const teamProjected = optimalStarters.reduce((sum, p) => sum + p.weeklyProj, 0);
  const teamFloor = optimalStarters.reduce((sum, p) => sum + p.weeklyFloor, 0);
  const teamCeiling = optimalStarters.reduce((sum, p) => sum + p.weeklyCeiling, 0);

  // Win Probability calculation (Simple sigmoidal model)
  const scoreDiff = teamProjected - opponentProjected;
  const winProb = Math.min(95, Math.max(5, Math.round(50 + (scoreDiff * 2.2))));

  // Strategy Recommendation
  let recommendedStrategy = 'CONSERVATIVE';
  let strategyReason = '';

  if (scoreDiff >= 8) {
    recommendedStrategy = 'CONSERVATIVE';
    strategyReason = `🛡️ You are projected to win by +${Math.round(scoreDiff)} pts. Use CONSERVATIVE mode to secure a high floor and lock in victory.`;
  } else {
    recommendedStrategy = 'AGGRESSIVE';
    strategyReason = `⚡ Underdog / Tight Matchup (${Math.round(scoreDiff)} pts diff). Use AGGRESSIVE mode to maximize high ceiling upside!`;
  }

  // Waiver Wire Recommendations (Free agents not on user or opponent team)
  const rosteredSet = new Set([...userRoster, ...(state.opponentRoster || [])]);
  const freeAgents = players
    .filter(p => !rosteredSet.has(p.id))
    .map(p => ({
      ...p,
      weeklyProj: Math.round((p.projectedPts / 17) * 10) / 10,
      upsideScore: Math.round((p.targetShare * 1.5 + (p.ceilingPts || 15) * 0.5) * 10) / 10
    }))
    .sort((a, b) => b.upsideScore - a.upsideScore)
    .slice(0, 5);

  return {
    optimalStarters,
    bench,
    teamProjected: Math.round(teamProjected * 10) / 10,
    teamFloor: Math.round(teamFloor * 10) / 10,
    teamCeiling: Math.round(teamCeiling * 10) / 10,
    opponentProjected,
    winProb,
    recommendedStrategy,
    strategyReason,
    waiverRecommendations: freeAgents
  };
}
