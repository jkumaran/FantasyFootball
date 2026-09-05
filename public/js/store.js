import { INITIAL_PLAYERS } from './data/players.js';
import { api } from './api.js';

const STORAGE_KEY = 'fantasy_suite_state_v1';

export const DEFAULT_TIER_GAPS = {
  RB: { 1: 0, 2: 30, 3: 30, 4: 30, 5: 30 },
  WR: { 1: 45, 2: 30, 3: 30, 4: 30, 5: 30 },
  QB: { 1: 240, 2: 35, 3: 30, 4: 30, 5: 30 },
  TE: { 1: 180, 2: 30, 3: 30, 4: 30, 5: 30 },
  DST: { 1: 450, 2: 30, 3: 30, 4: 30, 5: 30 },
  K: { 1: 500, 2: 30, 3: 30, 4: 30, 5: 30 }
};

class Store {
  constructor() {
    this.listeners = [];
    this.state = this.loadInitialState();
    this.syncFromBackend();
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          league: { teamsCount: 12, format: 'Snake', scoring: 'Half-PPR', userSlot: 1 },
          players: INITIAL_PLAYERS,
          draftPicks: [],
          currentPick: 1,
          weeklyStrategy: 'CONSERVATIVE',
          userRoster: ['rb-1', 'wr-1', 'qb-1', 'te-1'],
          opponentRoster: ['rb-2', 'wr-2', 'qb-2', 'te-2'],
          opponentProjected: 115.0,
          tierGaps: JSON.parse(JSON.stringify(DEFAULT_TIER_GAPS)),
          ...parsed,
          tierGaps: {
            ...DEFAULT_TIER_GAPS,
            ...(parsed.tierGaps || {})
          }
        };
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    return {
      league: { teamsCount: 12, format: 'Snake', scoring: 'Half-PPR', userSlot: 1 },
      players: INITIAL_PLAYERS,
      draftPicks: [],
      currentPick: 1,
      weeklyStrategy: 'CONSERVATIVE',
      userRoster: ['rb-1', 'wr-1', 'qb-1', 'te-1'],
      opponentRoster: ['rb-2', 'wr-2', 'qb-2', 'te-2'],
      opponentProjected: 115.0,
      tierGaps: JSON.parse(JSON.stringify(DEFAULT_TIER_GAPS))
    };
  }

  async syncFromBackend() {
    const remotePlayers = await api.getPlayers();
    if (remotePlayers && remotePlayers.length > 0) {
      this.state.players = remotePlayers;
      this.saveState();
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Save state error:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
  }

  getState() {
    return this.state;
  }

  getTierGap(pos, tierNum) {
    if (!this.state.tierGaps) this.state.tierGaps = JSON.parse(JSON.stringify(DEFAULT_TIER_GAPS));
    if (!this.state.tierGaps[pos]) this.state.tierGaps[pos] = {};
    if (this.state.tierGaps[pos][tierNum] !== undefined) {
      return this.state.tierGaps[pos][tierNum];
    }
    return DEFAULT_TIER_GAPS[pos]?.[tierNum] ?? 25;
  }

  setTierGap(pos, tierNum, gapPx) {
    if (!this.state.tierGaps) this.state.tierGaps = JSON.parse(JSON.stringify(DEFAULT_TIER_GAPS));
    if (!this.state.tierGaps[pos]) this.state.tierGaps[pos] = {};
    this.state.tierGaps[pos][tierNum] = Math.max(0, Math.round(gapPx));
    this.saveState();
  }

  async addCustomPlayer(name, pos, team = 'FA', tier = 1) {
    if (!name || !name.trim()) return;
    const newId = `${pos.toLowerCase()}-custom-${Date.now()}`;
    const maxRank = Math.max(...this.state.players.map(p => p.customRank || p.ecr || 50), 0) + 1;
    
    const newPlayer = {
      id: newId,
      name: name.trim(),
      pos,
      team: team.trim().toUpperCase() || 'FA',
      bye: 10,
      ecr: maxRank,
      customRank: maxRank,
      tier: parseInt(tier, 10) || 1,
      projectedPts: 150.0,
      floorPts: 8.0,
      ceilingPts: 18.0,
      targetShare: 15.0,
      redzoneTouches: 20,
      airYardsShare: 15.0,
      pastPts: 140.0,
      opponent: 'TBD',
      opponentRank: 16,
      matchupGrade: 'B',
      notes: 'Custom added player.',
      sleeperTag: null
    };

    this.state.players.push(newPlayer);
    this.saveState();
  }

  async reorderPlayer(draggedPlayerId, targetPlayerId, position = 'before') {
    const draggedIdx = this.state.players.findIndex(p => p.id === draggedPlayerId);
    const targetIdx = this.state.players.findIndex(p => p.id === targetPlayerId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const draggedPlayer = this.state.players[draggedIdx];
    const targetPlayer = this.state.players[targetIdx];

    // Align pos & tier with target
    draggedPlayer.pos = targetPlayer.pos;
    draggedPlayer.tier = targetPlayer.tier;

    // Remove from current position
    this.state.players.splice(draggedIdx, 1);

    // Find new insertion point
    const newTargetIdx = this.state.players.findIndex(p => p.id === targetPlayerId);
    const insertIdx = position === 'after' ? newTargetIdx + 1 : newTargetIdx;

    this.state.players.splice(insertIdx, 0, draggedPlayer);

    // Recalculate custom ranks for consistency
    this.state.players.forEach((p, idx) => {
      p.customRank = idx + 1;
    });

    this.saveState();
    await api.updateTier(draggedPlayer.id, draggedPlayer.tier);
  }

  async movePlayerToTierEnd(draggedPlayerId, targetPos, targetTier) {
    const draggedIdx = this.state.players.findIndex(p => p.id === draggedPlayerId);
    if (draggedIdx === -1) return;

    const draggedPlayer = this.state.players[draggedIdx];
    draggedPlayer.pos = targetPos;
    draggedPlayer.tier = parseInt(targetTier, 10);

    this.state.players.splice(draggedIdx, 1);

    let lastIdx = -1;
    for (let i = 0; i < this.state.players.length; i++) {
      if (this.state.players[i].pos === targetPos && this.state.players[i].tier === draggedPlayer.tier) {
        lastIdx = i;
      }
    }

    if (lastIdx !== -1) {
      this.state.players.splice(lastIdx + 1, 0, draggedPlayer);
    } else {
      this.state.players.push(draggedPlayer);
    }

    this.state.players.forEach((p, idx) => {
      p.customRank = idx + 1;
    });

    this.saveState();
    await api.updateTier(draggedPlayer.id, draggedPlayer.tier);
  }

  async reorderTiers(pos, fromTier, toTier) {
    if (fromTier === toTier) return;
    const posPlayers = this.state.players.filter(x => x.pos === pos);
    
    posPlayers.forEach(p => {
      if (p.tier === fromTier) p.tier = toTier;
      else if (p.tier === toTier) p.tier = fromTier;
    });

    this.saveState();
  }

  async updatePlayerCustomRank(playerId, newRank) {
    const p = this.state.players.find(x => x.id === playerId);
    if (p) {
      p.customRank = parseInt(newRank, 10);
      this.saveState();
      await api.updateRank(playerId, newRank);
    }
  }

  async draftPlayer(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    const pickNum = this.state.currentPick;
    const teamsCount = this.state.league.teamsCount || 12;
    const round = Math.ceil(pickNum / teamsCount);
    const pickInRound = ((pickNum - 1) % teamsCount) + 1;
    const teamId = (round % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1);

    this.state.draftPicks.push({ pickNum, round, teamId, player });
    this.state.currentPick += 1;

    if (teamId === (this.state.league.userSlot || 1)) {
      if (!this.state.userRoster.includes(playerId)) {
        this.state.userRoster.push(playerId);
      }
    }

    this.saveState();
    await api.draftPick(playerId);
  }

  async undoLastPick() {
    if (this.state.draftPicks.length === 0) return;
    const lastPick = this.state.draftPicks.pop();
    this.state.currentPick = Math.max(1, this.state.currentPick - 1);

    if (lastPick.teamId === (this.state.league.userSlot || 1)) {
      this.state.userRoster = this.state.userRoster.filter(id => id !== lastPick.player.id);
    }

    this.saveState();
    await api.undoPick();
  }

  async resetDraft() {
    this.state.draftPicks = [];
    this.state.currentPick = 1;
    this.saveState();
    await api.resetDraft();
  }

  setWeeklyStrategy(mode) {
    this.state.weeklyStrategy = mode;
    this.saveState();
  }

  async updateLeagueSettings(newSettings) {
    this.state.league = { ...this.state.league, ...newSettings };
    this.saveState();
    await api.saveSettings(newSettings);
  }
}

export const store = new Store();
