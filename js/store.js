/**
 * Central State Store with LocalStorage Persistence
 */
import { INITIAL_PLAYERS } from './data/players.js';

const STORAGE_KEY = 'fantasy_suite_state_v1';

class Store {
  constructor() {
    this.listeners = [];
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure standard defaults merged
        return {
          league: {
            teamsCount: 12,
            format: 'Snake',
            scoring: 'Half-PPR',
            userSlot: 1, // 1st pick by default
            rosterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 6 }
          },
          players: INITIAL_PLAYERS,
          draftPicks: [], // { pickNum, teamId, player }
          currentPick: 1,
          weeklyStrategy: 'CONSERVATIVE',
          userRoster: [], // player IDs
          opponentRoster: [], // player IDs
          opponentProjected: 112.5,
          ...parsed
        };
      }
    } catch (e) {
      console.warn('Failed to parse state from localStorage, falling back to default:', e);
    }

    // Default Initial State
    return {
      league: {
        teamsCount: 12,
        format: 'Snake',
        scoring: 'Half-PPR',
        userSlot: 1,
        rosterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 6 }
      },
      players: INITIAL_PLAYERS,
      draftPicks: [],
      currentPick: 1,
      weeklyStrategy: 'CONSERVATIVE',
      userRoster: ['rb-1', 'wr-1', 'qb-1', 'te-1'], // Default initial starters
      opponentRoster: ['rb-2', 'wr-2', 'qb-2', 'te-2'],
      opponentProjected: 115.0
    };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error saving state:', e);
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

  // --- ACTIONS ---

  // Update Tier of a player
  updatePlayerTier(playerId, newTier) {
    const p = this.state.players.find(x => x.id === playerId);
    if (p) {
      p.tier = parseInt(newTier, 10);
      this.saveState();
    }
  }

  // Update Custom Rank
  updatePlayerCustomRank(playerId, newRank) {
    const p = this.state.players.find(x => x.id === playerId);
    if (p) {
      p.customRank = parseInt(newRank, 10);
      this.saveState();
    }
  }

  // Draft a player in War Room
  draftPlayer(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    // Determine current pick team ID (1 to teamsCount in snake order)
    const pickNum = this.state.currentPick;
    const teamsCount = this.state.league.teamsCount;
    const round = Math.ceil(pickNum / teamsCount);
    const pickInRound = ((pickNum - 1) % teamsCount) + 1;
    
    let teamId;
    if (round % 2 === 1) {
      // Odd round: 1 to N
      teamId = pickInRound;
    } else {
      // Even round (Snake): N to 1
      teamId = teamsCount - pickInRound + 1;
    }

    const draftRecord = {
      pickNum,
      round,
      teamId,
      player
    };

    this.state.draftPicks.push(draftRecord);
    this.state.currentPick += 1;

    // If teamId is userSlot, add to userRoster
    if (teamId === this.state.league.userSlot) {
      if (!this.state.userRoster.includes(playerId)) {
        this.state.userRoster.push(playerId);
      }
    }

    this.saveState();
  }

  // Undo Last Draft Pick
  undoLastPick() {
    if (this.state.draftPicks.length === 0) return;
    const lastPick = this.state.draftPicks.pop();
    this.state.currentPick = Math.max(1, this.state.currentPick - 1);

    // Remove from user roster if it was user's pick
    if (lastPick.teamId === this.state.league.userSlot) {
      this.state.userRoster = this.state.userRoster.filter(id => id !== lastPick.player.id);
    }

    this.saveState();
  }

  // Reset Draft
  resetDraft() {
    this.state.draftPicks = [];
    this.state.currentPick = 1;
    this.saveState();
  }

  // Set Weekly Strategy Mode (CONSERVATIVE vs AGGRESSIVE)
  setWeeklyStrategy(mode) {
    this.state.weeklyStrategy = mode;
    this.saveState();
  }

  // Toggle user roster starting lineup
  toggleUserRosterPlayer(playerId) {
    if (this.state.userRoster.includes(playerId)) {
      this.state.userRoster = this.state.userRoster.filter(id => id !== playerId);
    } else {
      this.state.userRoster.push(playerId);
    }
    this.saveState();
  }

  // Update League Settings
  updateLeagueSettings(newSettings) {
    this.state.league = { ...this.state.league, ...newSettings };
    this.saveState();
  }

  // Import custom JSON state
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.players && Array.isArray(data.players)) {
        this.state = { ...this.state, ...data };
        this.saveState();
        return true;
      }
    } catch (e) {
      console.error('Failed to import json:', e);
    }
    return false;
  }
}

export const store = new Store();
