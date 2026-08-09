/**
 * API Service layer communicating with Node.js / Turso Backend
 */

export const api = {
  async getPlayers() {
    try {
      const res = await fetch('/api/players');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return data.players;
    } catch (e) {
      console.warn('Backend unavailable, using local fallback:', e);
      return null;
    }
  },

  async updateTier(id, tier) {
    try {
      await fetch('/api/players/tier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tier })
      });
    } catch (e) {
      console.warn('Backend tier sync failed:', e);
    }
  },

  async updateRank(id, rank) {
    try {
      await fetch('/api/players/rank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rank })
      });
    } catch (e) {
      console.warn('Backend rank sync failed:', e);
    }
  },

  async draftPick(playerId) {
    try {
      const res = await fetch('/api/draft/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      return await res.json();
    } catch (e) {
      console.warn('Backend draft pick sync failed:', e);
      return null;
    }
  },

  async undoPick() {
    try {
      const res = await fetch('/api/draft/undo', { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.warn('Backend undo failed:', e);
      return null;
    }
  },

  async resetDraft() {
    try {
      await fetch('/api/draft/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Backend reset failed:', e);
    }
  },

  async syncNews() {
    try {
      const res = await fetch('/api/sync/news', { method: 'POST' });
      return await res.json();
    } catch (e) {
      console.warn('Backend news sync failed:', e);
      return null;
    }
  },

  async saveSettings(settings) {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (e) {
      console.warn('Backend settings sync failed:', e);
    }
  }
};
