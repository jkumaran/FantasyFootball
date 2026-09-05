import { INITIAL_PLAYERS } from './data/players.js';
import { api } from './api.js';

const STORAGE_KEY = 'fantasy_suite_state_v1';

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
        return {
          league: { teamsCount: 12, format: 'Snake', scoring: 'Half-PPR', userSlot: 1 },
          players: INITIAL_PLAYERS,
          draftPicks: [],
          currentPick: 1,
          weeklyStrategy: 'CONSERVATIVE',
          userRoster: ['rb-1', 'wr-1', 'qb-1', 'te-1'],
          opponentRoster: ['rb-2', 'wr-2', 'qb-2', 'te-2'],
          opponentProjected: 115.0,
          ...JSON.parse(saved)
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
      opponentProjected: 115.0
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

  async updatePlayerTier(playerId, newTier) {
    const p = this.state.players.find(x => x.id === playerId);
    if (p) {
      p.tier = parseInt(newTier, 10);
      this.saveState();
      await api.updateTier(playerId, newTier);
    }
  }

  async movePlayerToTier(playerId, targetTier, targetIndex = null) {
    const p = this.state.players.find(x => x.id === playerId);
    if (!p) return;
    p.tier = parseInt(targetTier, 10);

    if (targetIndex !== null) {
      const posPlayers = this.state.players.filter(x => x.pos === p.pos && x.tier === p.tier);
      const otherPlayers = this.state.players.filter(x => x.pos !== p.pos || x.tier !== p.tier);
      
      const filteredPos = posPlayers.filter(x => x.id !== playerId);
      filteredPos.splice(targetIndex, 0, p);
      
      this.state.players = [...otherPlayers, ...filteredPos];
    }

    this.saveState();
    await api.updateTier(playerId, targetTier);
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
