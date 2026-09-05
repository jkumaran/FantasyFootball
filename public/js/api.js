/**
 * API Service layer communicating with Node.js / Turso Backend
 */

export const api = {
  async checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      if (!res.ok) return { authenticated: false };
      const data = await res.json();
      return { authenticated: Boolean(data && data.authenticated) };
    } catch (e) {
      return { authenticated: false };
    }
  },

  async login(password, durationDays = 30) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, durationDays })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return { success: false, error: e.message || 'Login failed' };
    }
  },

  async logout() {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async getPlayers() {
    try {
      const res = await fetch('/api/players', { credentials: 'include' });
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
      const res = await fetch('/api/players/tier', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, tier })
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
      }
    } catch (e) {
      console.warn('Backend tier sync failed:', e);
    }
  },

  async updateRank(id, rank) {
    try {
      const res = await fetch('/api/players/rank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, rank })
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
      }
    } catch (e) {
      console.warn('Backend rank sync failed:', e);
    }
  },

  async draftPick(playerId) {
    try {
      const res = await fetch('/api/draft/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ playerId })
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
        return { success: false, error: 'Authentication required' };
      }
      return await res.json();
    } catch (e) {
      console.warn('Backend draft pick sync failed:', e);
      return null;
    }
  },

  async undoPick() {
    try {
      const res = await fetch('/api/draft/undo', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
      }
      return await res.json();
    } catch (e) {
      console.warn('Backend undo failed:', e);
      return null;
    }
  },

  async resetDraft() {
    try {
      const res = await fetch('/api/draft/reset', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
      }
    } catch (e) {
      console.warn('Backend reset failed:', e);
    }
  },

  async syncNews() {
    try {
      const res = await fetch('/api/sync/news', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
      }
      return await res.json();
    } catch (e) {
      console.warn('Backend news sync failed:', e);
      return null;
    }
  },

  async saveSettings(settings) {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
      }
    } catch (e) {
      console.warn('Backend settings sync failed:', e);
    }
  },

  async getDeployStatus() {
    try {
      const res = await fetch('/api/deploy-status');
      if (!res.ok) throw new Error('Status check failed');
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getBoardYaml() {
    try {
      const res = await fetch('/api/board/yaml', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.yaml) return data;
      }
    } catch (e) {
      console.warn('API getBoardYaml failed:', e);
    }
    // Fallback: fetch static file /data/tier_board.yaml
    try {
      const res2 = await fetch('/data/tier_board.yaml');
      if (res2.ok) {
        const text = await res2.text();
        if (text && text.includes('positions:')) {
          return { success: true, yaml: text, file: 'data/tier_board.yaml (static)' };
        }
      }
    } catch (e) {
      console.warn('Static getBoardYaml fallback failed:', e);
    }
    return null;
  },

  async saveBoardYaml(yaml) {
    try {
      const res = await fetch('/api/board/yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ yaml })
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
        return { success: false, error: 'Authentication required' };
      }
      return await res.json();
    } catch (e) {
      console.warn('YAML sync to server failed:', e);
      return { success: false, error: e.message };
    }
  },

  async getDefaultBoardYaml() {
    try {
      const res = await fetch('/api/board/default-yaml', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.yaml) return data;
      }
    } catch (e) {
      console.warn('API getDefaultBoardYaml failed:', e);
    }
    // Fallback: fetch static file /data/default_tier_board.yaml
    try {
      const res2 = await fetch('/data/default_tier_board.yaml');
      if (res2.ok) {
        const text = await res2.text();
        if (text && text.includes('positions:')) {
          return { success: true, yaml: text, file: 'data/default_tier_board.yaml (static)' };
        }
      }
    } catch (e) {
      console.warn('Static getDefaultBoardYaml fallback failed:', e);
    }
    return null;
  },

  async resetToDefaultBoard() {
    try {
      const res = await fetch('/api/board/reset-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (res.status === 401 && typeof window.onAuthRequired === 'function') {
        window.onAuthRequired();
        return { success: false, error: 'Authentication required' };
      }
      return await res.json();
    } catch (e) {
      console.warn('API resetToDefaultBoard failed:', e);
      return { success: false, error: e.message };
    }
  }
};
