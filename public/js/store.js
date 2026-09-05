import { INITIAL_PLAYERS } from './data/players.js';
import { api } from './api.js';

const STORAGE_KEY = 'fantasy_suite_state_v1';

export const DEFAULT_TIER_GAPS = {
  RB: { 1: 0, 2: 30, 3: 30, 4: 30, 5: 30 },
  WR: { 1: 45, 2: 30, 3: 30, 4: 30, 5: 30 },
  TE: { 1: 180, 2: 30, 3: 30, 4: 30, 5: 30 },
  QB: { 1: 240, 2: 35, 3: 30, 4: 30, 5: 30 },
  DST: { 1: 450, 2: 30, 3: 30, 4: 30, 5: 30 },
  K: { 1: 500, 2: 30, 3: 30, 4: 30, 5: 30 }
};

export function parseBoardYaml(yamlText) {
  if (!yamlText || typeof yamlText !== 'string') return null;

  const result = {
    tierGaps: {},
    players: [],
    positions: []
  };

  function extractYamlString(str) {
    if (!str) return '';
    const s = str.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1).replace(/\\"/g, '"');
    }
    return s;
  }

  const lines = yamlText.split(/\r?\n/);
  let currentSection = null;
  let currentPos = null;
  let currentTier = null;
  let currentPlayer = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    if (rawLine.startsWith('vertical_tier_gaps_px:')) {
      currentSection = 'gaps';
      continue;
    } else if (rawLine.startsWith('positions:')) {
      currentSection = 'positions';
      continue;
    } else if (rawLine.startsWith('metadata:') || rawLine.startsWith('column_order:')) {
      currentSection = 'meta';
      continue;
    }

    if (currentSection === 'gaps') {
      const posMatch = rawLine.match(/^  ([A-Za-z]+):/);
      if (posMatch) {
        currentPos = posMatch[1].toUpperCase();
        if (!result.tierGaps[currentPos]) result.tierGaps[currentPos] = {};
        continue;
      }
      const tierMatch = rawLine.match(/^    tier_([1-5]):\s*(\d+)/);
      if (tierMatch && currentPos) {
        const tNum = parseInt(tierMatch[1], 10);
        const gapVal = parseInt(tierMatch[2], 10);
        result.tierGaps[currentPos][tNum] = gapVal;
      }
    } else if (currentSection === 'positions') {
      const posMatch = rawLine.match(/^  ([A-Za-z]+):/);
      if (posMatch) {
        currentPos = posMatch[1].toUpperCase();
        if (!result.positions.includes(currentPos)) result.positions.push(currentPos);
        continue;
      }

      const tierMatch = rawLine.match(/^    tier_([1-5]):/);
      if (tierMatch) {
        currentTier = parseInt(tierMatch[1], 10);
        continue;
      }

      const gapMatch = rawLine.match(/^      offset_gap_px:\s*(\d+)/);
      if (gapMatch && currentPos && currentTier) {
        if (!result.tierGaps[currentPos]) result.tierGaps[currentPos] = {};
        result.tierGaps[currentPos][currentTier] = parseInt(gapMatch[1], 10);
        continue;
      }

      if (trimmed.startsWith('- rank_in_tier:') || trimmed.startsWith('- name:')) {
        if (currentPlayer) {
          result.players.push(currentPlayer);
        }
        currentPlayer = {
          pos: currentPos,
          tier: currentTier,
          drafted: false
        };
        const rankMatch = trimmed.match(/- rank_in_tier:\s*(\d+)/);
        if (rankMatch) currentPlayer.rankInTier = parseInt(rankMatch[1], 10);
        const nameMatch = trimmed.match(/- name:\s*(.*)$/);
        if (nameMatch) currentPlayer.name = extractYamlString(nameMatch[1]);
        continue;
      }

      if (currentPlayer) {
        const nameMatch = trimmed.match(/^name:\s*(.*)$/);
        if (nameMatch) currentPlayer.name = extractYamlString(nameMatch[1]);

        const teamMatch = trimmed.match(/^team:\s*(.*)$/);
        if (teamMatch) currentPlayer.team = extractYamlString(teamMatch[1]);

        const byeMatch = trimmed.match(/^bye:\s*(\d+)/);
        if (byeMatch) currentPlayer.bye = parseInt(byeMatch[1], 10);

        const draftedMatch = trimmed.match(/^drafted:\s*(true|false)/i);
        if (draftedMatch) currentPlayer.drafted = draftedMatch[1].toLowerCase() === 'true';

        const projMatch = trimmed.match(/^projected_pts:\s*([0-9.]+)/);
        if (projMatch) currentPlayer.projectedPts = parseFloat(projMatch[1]);

        const ecrMatch = trimmed.match(/^ecr:\s*(\d+)/);
        if (ecrMatch) currentPlayer.ecr = parseInt(ecrMatch[1], 10);
      }
    }
  }

  if (currentPlayer) {
    result.players.push(currentPlayer);
  }

  return result;
}

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
      console.warn('Load local state error:', e);
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
    try {
      // 1. By default, load from fixed YAML file on the server if it exists
      const yamlResult = await api.getBoardYaml();
      if (yamlResult && yamlResult.success && yamlResult.yaml) {
        this.loadFromYaml(yamlResult.yaml, true);
        return;
      }
    } catch (e) {
      console.warn('YAML server load check:', e);
    }

    // Fallback: sync players from DB
    try {
      const remotePlayers = await api.getPlayers();
      if (remotePlayers && remotePlayers.length > 0) {
        this.state.players = remotePlayers;
        this.saveState();
      }
    } catch (e) {
      console.warn('Player DB sync fallback:', e);
    }
  }

  loadFromYaml(yamlText, skipBackendSave = false) {
    const parsed = parseBoardYaml(yamlText);
    if (!parsed) return false;

    // 1. Apply tier gaps if present (deep-merge by position)
    if (parsed.tierGaps && typeof parsed.tierGaps === 'object') {
      if (!this.state.tierGaps) this.state.tierGaps = {};
      Object.keys(parsed.tierGaps).forEach(pos => {
        this.state.tierGaps[pos] = {
          ...(this.state.tierGaps[pos] || {}),
          ...parsed.tierGaps[pos]
        };
      });
    }

    // 2. Apply player tiers, positions, custom ranks, and draft statuses in YAML sequence
    if (parsed.players && parsed.players.length > 0) {
      const orderedPlayers = [];
      const usedIds = new Set();
      const yamlDraftedMap = new Map(); // playerId -> boolean

      parsed.players.forEach((yp, index) => {
        let match = this.state.players.find(p => p.name.toLowerCase() === yp.name.toLowerCase() && p.pos.toUpperCase() === yp.pos.toUpperCase());
        if (!match) {
          match = this.state.players.find(p => p.name.toLowerCase() === yp.name.toLowerCase());
        }

        const slug = (yp.name || 'player').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const deterministicId = `${yp.pos.toLowerCase()}-${slug}`;

        if (!match) {
          match = this.state.players.find(p => p.id === deterministicId);
        }

        if (match) {
          match.tier = yp.tier || match.tier || 1;
          match.pos = yp.pos || match.pos;
          match.customRank = index + 1;
          if (yp.projectedPts !== undefined) match.projectedPts = yp.projectedPts;
          if (yp.ecr !== undefined) match.ecr = yp.ecr;
          if (yp.bye !== undefined) match.bye = yp.bye;
          if (yp.team) match.team = yp.team;

          if (!usedIds.has(match.id)) {
            orderedPlayers.push(match);
            usedIds.add(match.id);
          }
          yamlDraftedMap.set(match.id, !!yp.drafted);
        } else {
          // New player from YAML
          const newPlayer = {
            id: deterministicId,
            name: yp.name,
            pos: yp.pos,
            team: yp.team || 'FA',
            bye: yp.bye || 8,
            tier: yp.tier || 1,
            ecr: yp.ecr || (index + 1),
            customRank: index + 1,
            projectedPts: yp.projectedPts || 200,
            floorPts: 10,
            ceilingPts: 22,
            targetShare: 15,
            redzoneTouches: 25,
            airYardsShare: 15,
            pastPts: 180,
            opponent: 'FA',
            opponentRank: 16,
            matchupGrade: 'B',
            notes: 'Loaded from YAML',
            sleeperTag: null
          };
          orderedPlayers.push(newPlayer);
          usedIds.add(newPlayer.id);
          yamlDraftedMap.set(newPlayer.id, !!yp.drafted);
        }
      });

      // Retain any remaining players in state that were not explicitly listed in YAML
      this.state.players.forEach(p => {
        if (!usedIds.has(p.id)) {
          orderedPlayers.push(p);
        }
      });

      this.state.players = orderedPlayers;

      // 3. Synchronize draft picks with YAML drafted status
      this.state.draftPicks = this.state.draftPicks.filter(dp => {
        if (!dp.player) return false;
        if (yamlDraftedMap.has(dp.player.id)) {
          return yamlDraftedMap.get(dp.player.id) === true;
        }
        return true;
      });

      yamlDraftedMap.forEach((isDrafted, playerId) => {
        if (isDrafted && !this.isPlayerDrafted(playerId)) {
          const player = this.state.players.find(p => p.id === playerId);
          if (player) {
            const pickNum = this.state.draftPicks.length + 1;
            const teamsCount = this.state.league.teamsCount || 12;
            const round = Math.ceil(pickNum / teamsCount);
            const pickInRound = ((pickNum - 1) % teamsCount) + 1;
            const teamId = (round % 2 === 1) ? pickInRound : (teamsCount - pickInRound + 1);
            this.state.draftPicks.push({ pickNum, round, teamId, player });
          }
        }
      });

      this.state.draftPicks.forEach((dp, i) => {
        dp.pickNum = i + 1;
        const teamsCount = this.state.league.teamsCount || 12;
        dp.round = Math.ceil(dp.pickNum / teamsCount);
      });
      this.state.currentPick = this.state.draftPicks.length + 1;
    }

    this.saveState(skipBackendSave);
    return true;
  }

  exportYaml() {
    const { players, league } = this.state;
    const positions = ['RB', 'WR', 'TE', 'QB', 'DST', 'K'];
    const availableTiers = [1, 2, 3, 4, 5];
    const colWidth = 24;
    const separator = ' | ';
    const now = new Date().toISOString();

    const colLines = {};
    positions.forEach(pos => {
      colLines[pos] = [];
      availableTiers.forEach(t => {
        const gapPx = this.getTierGap(pos, t);
        const numBlankLines = Math.max(0, Math.round(gapPx / 28));
        for (let b = 0; b < numBlankLines; b++) {
          colLines[pos].push(' '.repeat(colWidth));
        }

        const tierHeader = `=== TIER ${t} ===`;
        colLines[pos].push(tierHeader.padEnd(colWidth));

        const tierPlayers = players.filter(p => p.pos === pos && (p.tier || 1) === t);
        if (tierPlayers.length === 0) {
          colLines[pos].push('(No players)'.padEnd(colWidth));
        } else {
          tierPlayers.forEach(p => {
            const isDrafted = this.isPlayerDrafted(p.id);
            const chk = isDrafted ? '[X]' : '[ ]';
            const parts = p.name.split(' ');
            const shortName = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : p.name;
            const label = `${chk} ${shortName} (${p.team})`;
            const truncated = label.length > colWidth ? label.slice(0, colWidth - 1) + '…' : label;
            colLines[pos].push(truncated.padEnd(colWidth));
          });
        }
        colLines[pos].push(' '.repeat(colWidth));
      });
    });

    const maxLines = Math.max(...positions.map(pos => colLines[pos].length));
    const headerCols = positions.map(pos => {
      const topGap = this.getTierGap(pos, 1);
      return `${pos} (T1 Gap:${topGap}px)`.padEnd(colWidth);
    }).join(separator);
    const divider = positions.map(() => '-'.repeat(colWidth)).join('-+-');

    const asciiMatrixRows = [];
    for (let i = 0; i < maxLines; i++) {
      const row = positions.map(pos => {
        const line = colLines[pos][i] || ' '.repeat(colWidth);
        return line.padEnd(colWidth);
      }).join(separator);
      asciiMatrixRows.push(`# ${row}`);
    }

    const lines = [
      '# ========================================================================================================================',
      '#                                      🏈 FANTASY FOOTBALL POSITIONAL TIER BOARD                                          ',
      '# ========================================================================================================================',
      `# Exported: ${now}`,
      `# Format: ${league.scoring || 'Half-PPR'} ${league.format || 'Snake'} Draft (${league.teamsCount || 12} Teams)`,
      `# Column Order: ${positions.join(' -> ')}`,
      '# Legend: [ ] = Available, [X] = Drafted',
      '# ------------------------------------------------------------------------------------------------------------------------',
      '# VISUAL TIER BOARD MATRIX (Vertical Spacing & Alignment by Pixel Offsets)',
      '# ------------------------------------------------------------------------------------------------------------------------',
      `# ${headerCols}`,
      `# ${divider}`,
      ...asciiMatrixRows,
      '# ========================================================================================================================',
      '',
      'metadata:',
      '  version: "1.0"',
      `  exported_at: "${now}"`,
      `  scoring_format: "${league.scoring || 'Half-PPR'}"`,
      `  draft_type: "${league.format || 'Snake'}"`,
      `  teams_count: ${league.teamsCount || 12}`,
      `  user_draft_slot: ${league.userSlot || 1}`,
      '  column_order:'
    ];

    positions.forEach(pos => {
      lines.push(`    - ${pos}`);
    });

    lines.push('');
    lines.push('vertical_tier_gaps_px:');
    positions.forEach(pos => {
      lines.push(`  ${pos}:`);
      availableTiers.forEach(t => {
        lines.push(`    tier_${t}: ${this.getTierGap(pos, t)}`);
      });
    });

    lines.push('');
    lines.push('positions:');
    positions.forEach(pos => {
      lines.push(`  ${pos}:`);
      availableTiers.forEach(t => {
        const tierPlayers = players.filter(p => p.pos === pos && (p.tier || 1) === t);
        const gapPx = this.getTierGap(pos, t);
        lines.push(`    tier_${t}:`);
        lines.push(`      offset_gap_px: ${gapPx}`);
        lines.push(`      player_count: ${tierPlayers.length}`);
        lines.push('      players:');
        if (tierPlayers.length === 0) {
          lines.push('        []');
        } else {
          tierPlayers.forEach((p, idx) => {
            const isDrafted = this.isPlayerDrafted(p.id);
            const safeName = p.name.replace(/"/g, '\\"');
            lines.push(`        - rank_in_tier: ${idx + 1}`);
            lines.push(`          name: "${safeName}"`);
            lines.push(`          team: "${p.team}"`);
            lines.push(`          bye: ${p.bye}`);
            lines.push(`          drafted: ${isDrafted}`);
            lines.push(`          projected_pts: ${p.projectedPts}`);
            lines.push(`          ecr: ${p.ecr}`);
          });
        }
      });
    });

    return lines.join(String.fromCharCode(10)) + String.fromCharCode(10);
  }

  saveState(skipBackendSave = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Save state error:', e);
    }
    this.notify();

    if (!skipBackendSave) {
      // Auto-sync YAML to backend so fixed tier_board.yaml stays preserved across refreshes
      if (this._syncTimer) clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => {
        try {
          const yamlStr = this.exportYaml();
          api.saveBoardYaml(yamlStr);
        } catch (e) {}
      }, 1500);
    }
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

  isPlayerDrafted(playerId) {
    return this.state.draftPicks.some(dp => dp.player && dp.player.id === playerId);
  }

  async togglePlayerDrafted(playerId) {
    const isDrafted = this.isPlayerDrafted(playerId);
    if (isDrafted) {
      const pickIdx = this.state.draftPicks.findIndex(dp => dp.player && dp.player.id === playerId);
      if (pickIdx !== -1) {
        const removedPick = this.state.draftPicks.splice(pickIdx, 1)[0];
        this.state.draftPicks.forEach((dp, i) => {
          dp.pickNum = i + 1;
          const teamsCount = this.state.league.teamsCount || 12;
          dp.round = Math.ceil(dp.pickNum / teamsCount);
        });
        this.state.currentPick = this.state.draftPicks.length + 1;

        if (removedPick.teamId === (this.state.league.userSlot || 1)) {
          this.state.userRoster = this.state.userRoster.filter(id => id !== playerId);
        }
        this.saveState();
      }
    } else {
      await this.draftPlayer(playerId);
    }
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
      bye: 8,
      ecr: maxRank,
      customRank: maxRank,
      tier: parseInt(tier, 10),
      projectedPts: 180.0,
      floorPts: 8.0,
      ceilingPts: 18.0,
      targetShare: 10.0,
      redzoneTouches: 20,
      airYardsShare: 10.0,
      pastPts: 150.0,
      opponent: 'FA',
      opponentRank: 16,
      matchupGrade: 'B',
      notes: 'Custom user-entered player',
      sleeperTag: null
    };

    this.state.players.push(newPlayer);
    this.saveState();
  }

  async reorderPlayer(draggedPlayerId, targetPlayerId, position = 'before') {
    if (draggedPlayerId === targetPlayerId) return;

    const draggedIdx = this.state.players.findIndex(p => p.id === draggedPlayerId);
    const targetIdx = this.state.players.findIndex(p => p.id === targetPlayerId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const draggedPlayer = this.state.players[draggedIdx];
    const targetPlayer = this.state.players[targetIdx];

    draggedPlayer.pos = targetPlayer.pos;
    draggedPlayer.tier = targetPlayer.tier;

    this.state.players.splice(draggedIdx, 1);

    const newTargetIdx = this.state.players.findIndex(p => p.id === targetPlayerId);
    const insertIdx = position === 'after' ? newTargetIdx + 1 : newTargetIdx;

    this.state.players.splice(insertIdx, 0, draggedPlayer);

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
