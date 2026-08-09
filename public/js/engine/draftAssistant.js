export function getDraftRecommendations(state) {
  const { players, draftPicks, currentPick, league, userRoster } = state;
  const teamsCount = league.teamsCount || 12;
  const userSlot = league.userSlot || 1;

  const draftedIds = new Set(draftPicks.map(dp => dp.player.id));
  const availablePlayers = players.filter(p => !draftedIds.has(p.id));

  if (availablePlayers.length === 0) {
    return { topRecommendations: [], availabilityMap: {}, scarcityAlert: null };
  }

  const baselines = { QB: 250.0, RB: 180.0, WR: 190.0, TE: 140.0, DST: 120.0, K: 130.0 };

  const userDraftedPlayers = players.filter(p => userRoster.includes(p.id));
  const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 };
  userDraftedPlayers.forEach(p => {
    if (posCounts[p.pos] !== undefined) posCounts[p.pos]++;
  });

  const posNeeds = {
    QB: posCounts.QB === 0 ? 1.4 : 0.7,
    RB: posCounts.RB < 2 ? 1.5 : 1.1,
    WR: posCounts.WR < 2 ? 1.5 : 1.1,
    TE: posCounts.TE === 0 ? 1.3 : 0.6,
    DST: posCounts.DST === 0 ? 0.3 : 0.2,
    K: posCounts.K === 0 ? 0.2 : 0.2
  };

  const round = Math.ceil(currentPick / teamsCount);
  const pickInRound = ((currentPick - 1) % teamsCount) + 1;
  const currentPickTeam = (round % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1);

  let picksUntilNextUserPick = 0;
  let simulatedPick = currentPick;
  
  if (currentPickTeam === userSlot) {
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
    while (simulatedPick <= teamsCount * 16) {
      const simRound = Math.ceil(simulatedPick / teamsCount);
      const simPickInRound = ((simulatedPick - 1) % teamsCount) + 1;
      const simTeam = (simRound % 2 === 1) ? simPickInRound : (teamsCount - simPickInRound + 1);
      if (simTeam === userSlot) break;
      picksUntilNextUserPick++;
      simulatedPick++;
    }
  }

  const availabilityMap = {};
  
  const scoredPlayers = availablePlayers.map(p => {
    const baselinePts = baselines[p.pos] || 150.0;
    const vorp = Math.max(0, p.projectedPts - baselinePts);
    const rankWeight = Math.max(1, 100 - (p.customRank || p.ecr));

    const rankDiff = (p.customRank || p.ecr) - (currentPick + picksUntilNextUserPick / 2);
    let survivalOdds = 0;
    if (rankDiff > picksUntilNextUserPick * 0.8) survivalOdds = 85;
    else if (rankDiff > 0) survivalOdds = 45;
    else survivalOdds = 10;

    availabilityMap[p.id] = survivalOdds;

    const scarcityFactor = (p.tier <= 2 && survivalOdds < 40) ? 1.3 : 1.0;
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

  scoredPlayers.sort((a, b) => b.compositeScore - a.compositeScore);

  let scarcityAlert = null;
  const topTierRbs = availablePlayers.filter(p => p.pos === 'RB' && p.tier <= 2);
  const topTierWrs = availablePlayers.filter(p => p.pos === 'WR' && p.tier <= 2);

  if (topTierRbs.length === 1 && posCounts.RB < 2) {
    scarcityAlert = {
      type: 'WARNING',
      text: `🚨 TIER RUN ALERT: Only 1 top-tier RB remaining (${topTierRbs[0].name}). RBs will be wiped out before your next pick!`
    };
  } else if (topTierWrs.length === 1 && posCounts.WR < 2) {
    scarcityAlert = {
      type: 'WARNING',
      text: `🚨 TIER RUN ALERT: Only 1 top-tier WR remaining (${topTierWrs[0].name}). Prioritize securing WR now!`
    };
  } else if (picksUntilNextUserPick > 15) {
    scarcityAlert = {
      type: 'INFO',
      text: `⏳ LONG TURN AHEAD: ${picksUntilNextUserPick} picks before your next turn. Secure high-tier starters now.`
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
