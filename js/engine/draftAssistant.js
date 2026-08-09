/**
 * Live Draft Recommendation Engine
 * Calculates VORP, Roster Needs, Availability Odds, and Positional Scarcity Warnings.
 */

export function getDraftRecommendations(state) {
  const { players, draftPicks, currentPick, league, userRoster } = state;
  const teamsCount = league.teamsCount || 12;
  const userSlot = league.userSlot || 1;

  // 1. Identify already drafted player IDs
  const draftedIds = new Set(draftPicks.map(dp => dp.player.id));
  const availablePlayers = players.filter(p => !draftedIds.has(p.id));

  if (availablePlayers.length === 0) {
    return { topRecommendations: [], availabilityMap: {}, scarcityAlert: null };
  }

  // 2. Define Position Baselines for VORP (Replacement Level)
  // For 12 teams (1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX):
  // Baseline ranks: QB6, RB25, WR25, TE6
  const baselines = {
    QB: 250.0,
    RB: 180.0,
    WR: 190.0,
    TE: 140.0,
    DST: 120.0,
    K: 130.0
  };

  // 3. User Current Roster Breakdown
  const userDraftedPlayers = players.filter(p => userRoster.includes(p.id));
  const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 };
  userDraftedPlayers.forEach(p => {
    if (posCounts[p.pos] !== undefined) posCounts[p.pos]++;
  });

  // Calculate Roster Need Multiplier per position
  // Slots needed: QB: 1 (+1 bench), RB: 2 (+2 bench), WR: 2 (+2 bench), TE: 1 (+1 bench)
  const posNeeds = {
    QB: posCounts.QB === 0 ? 1.4 : posCounts.QB === 1 ? 0.7 : 0.4,
    RB: posCounts.RB < 2 ? 1.5 : posCounts.RB < 4 ? 1.1 : 0.8,
    WR: posCounts.WR < 2 ? 1.5 : posCounts.WR < 4 ? 1.1 : 0.8,
    TE: posCounts.TE === 0 ? 1.3 : 0.6,
    DST: posCounts.DST === 0 ? (currentPick > teamsCount * 12 ? 1.2 : 0.3) : 0.2,
    K: posCounts.K === 0 ? (currentPick > teamsCount * 13 ? 1.2 : 0.2) : 0.2
  };

  // 4. Calculate Picks Until User's Next Pick in Snake Draft
  const round = Math.ceil(currentPick / teamsCount);
  const pickInRound = ((currentPick - 1) % teamsCount) + 1;
  const currentPickTeam = (round % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1);

  // Find next pick index of userSlot
  let picksUntilNextUserPick = 0;
  let simulatedPick = currentPick;
  
  if (currentPickTeam === userSlot) {
    // It is currently user's turn! Find how many picks until user's SECOND next turn.
    simulatedPick++;
    while (simulatedPick <= teamsCount * 16) {
      const simRound = Math.ceil(simulatedPick / teamsCount);
      const simPickInRound = ((simulatedPick - 1) % teamsCount) + 1;
      const simTeam = (simRound % 2 === 1) ? simPickInRound : (teamsCount - simPickInRound + 1);
      picksUntilNextUserPick++;
      if (simTeam === userSlot) break;
      simulatedPick++;
    }
  } else {
    // Find picks until user's NEXT turn
    while (simulatedPick <= teamsCount * 16) {
      const simRound = Math.ceil(simulatedPick / teamsCount);
      const simPickInRound = ((simulatedPick - 1) % teamsCount) + 1;
      const simTeam = (simRound % 2 === 1) ? simPickInRound : (teamsCount - simPickInRound + 1);
      if (simTeam === userSlot) break;
      picksUntilNextUserPick++;
      simulatedPick++;
    }
  }

  // 5. Calculate Availability Probability (Survival Odds) & Composite Score
  const availabilityMap = {};
  
  const scoredPlayers = availablePlayers.map(p => {
    // VORP
    const baselinePts = baselines[p.pos] || 150.0;
    const vorp = Math.max(0, p.projectedPts - baselinePts);

    // ECR & Rank Weight
    const rankWeight = Math.max(1, 100 - (p.customRank || p.ecr));

    // Availability Odds:
    // Estimate expected picks before player taken based on ADP/Rank
    const rankDiff = (p.customRank || p.ecr) - (currentPick + picksUntilNextUserPick / 2);
    let survivalOdds = 0;
    if (rankDiff > picksUntilNextUserPick * 0.8) {
      survivalOdds = 85; // High odds to survive
    } else if (rankDiff > 0) {
      survivalOdds = 45; // Medium odds
    } else {
      survivalOdds = 10; // Low odds (Will likely be taken before next pick)
    }

    availabilityMap[p.id] = survivalOdds;

    // Scarcity Bonus: If player is high tier and survival odds are low
    const scarcityFactor = (p.tier <= 2 && survivalOdds < 40) ? 1.3 : 1.0;

    // Composite Recommendation Score
    const needMult = posNeeds[p.pos] || 1.0;
    const compositeScore = (vorp * 0.4 + rankWeight * 0.4) * needMult * scarcityFactor;

    return {
      player: p,
      vorp: Math.round(vorp * 10) / 10,
      survivalOdds,
      compositeScore,
      needMult
    };
  });

  // Sort by composite score descending
  scoredPlayers.sort((a, b) => b.compositeScore - a.compositeScore);

  // 6. Generate Scarcity / Strategic Alert
  let scarcityAlert = null;
  const topTierRbs = availablePlayers.filter(p => p.pos === 'RB' && p.tier <= 2);
  const topTierWrs = availablePlayers.filter(p => p.pos === 'WR' && p.tier <= 2);

  if (topTierRbs.length === 1 && posCounts.RB < 2) {
    scarcityAlert = {
      type: 'WARNING',
      text: `🚨 TIER RUN ALERT: Only 1 top-tier RB remaining (${topTierRbs[0].name}). With ${picksUntilNextUserPick} picks before your next turn, RBs will be wiped out!`
    };
  } else if (topTierWrs.length === 1 && posCounts.WR < 2) {
    scarcityAlert = {
      type: 'WARNING',
      text: `🚨 TIER RUN ALERT: Only 1 top-tier WR remaining (${topTierWrs[0].name}). Prioritize securing WR now!`
    };
  } else if (picksUntilNextUserPick > 15) {
    scarcityAlert = {
      type: 'INFO',
      text: `⏳ LONG TURN AHEAD: ${picksUntilNextUserPick} picks before your next turn. Secure high-tier starters now because available pool will shift significantly.`
    };
  }

  return {
    topRecommendations: scoredPlayers.slice(0, 5),
    picksUntilNextUserPick,
    isUserTurn: currentPickTeam === userSlot,
    currentPickTeam,
    scarcityAlert,
    availabilityMap
  };
}
