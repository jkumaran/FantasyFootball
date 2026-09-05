import { store } from '../store.js';

function downloadFile(content, filename, mimeType = 'text/yaml;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateBoardYaml(state, positions, availableTiers) {
  const { players, league } = state;
  const colWidth = 24;
  const separator = ' | ';
  const now = new Date().toISOString();

  // 1. Build Visual ASCII Alignment Matrix
  const colLines = {};
  positions.forEach(pos => {
    colLines[pos] = [];
    availableTiers.forEach(t => {
      const gapPx = store.getTierGap(pos, t);
      // Translate pixel gap into vertical blank line slots (approx 1 line per 28px)
      const numBlankLines = Math.max(0, Math.round(gapPx / 28));
      for (let b = 0; b < numBlankLines; b++) {
        colLines[pos].push(' '.repeat(colWidth));
      }

      // Tier Header Line
      const tierHeader = `=== TIER ${t} ===`;
      colLines[pos].push(tierHeader.padEnd(colWidth));

      // Players in this tier
      const tierPlayers = players.filter(p => p.pos === pos && (p.tier || 1) === t);
      if (tierPlayers.length === 0) {
        colLines[pos].push('(No players)'.padEnd(colWidth));
      } else {
        tierPlayers.forEach(p => {
          const isDrafted = store.isPlayerDrafted(p.id);
          const chk = isDrafted ? '[X]' : '[ ]';
          const parts = p.name.split(' ');
          const shortName = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : p.name;
          const label = `${chk} ${shortName} (${p.team})`;
          const truncated = label.length > colWidth ? label.slice(0, colWidth - 1) + '…' : label;
          colLines[pos].push(truncated.padEnd(colWidth));
        });
      }

      // 1 spacing line after tier block
      colLines[pos].push(' '.repeat(colWidth));
    });
  });

  const maxLines = Math.max(...positions.map(pos => colLines[pos].length));

  // ASCII column header line
  const headerCols = positions.map(pos => {
    const topGap = store.getTierGap(pos, 1);
    const title = `${pos} (T1 Gap:${topGap}px)`;
    return title.padEnd(colWidth);
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

  // 2. Structured YAML section
  let yaml = '';
  yaml += `# ========================================================================================================================
`;
  yaml += `#                                      🏈 FANTASY FOOTBALL POSITIONAL TIER BOARD                                          
`;
  yaml += `# ========================================================================================================================
`;
  yaml += `# Exported: ${now}
`;
  yaml += `# Format: ${league.scoring || 'Half-PPR'} ${league.format || 'Snake'} Draft (${league.teamsCount || 12} Teams)
`;
  yaml += `# Column Order: ${positions.join(' -> ')}
`;
  yaml += `# Legend: [ ] = Available, [X] = Drafted
`;
  yaml += `# ------------------------------------------------------------------------------------------------------------------------
`;
  yaml += `# VISUAL TIER BOARD MATRIX (Vertical Spacing & Alignment by Pixel Offsets)
`;
  yaml += `# ------------------------------------------------------------------------------------------------------------------------
`;
  yaml += `# ${headerCols}
`;
  yaml += `# ${divider}
`;
  yaml += asciiMatrixRows.join('
') + '
';
  yaml += `# ========================================================================================================================

`;

  yaml += `metadata:
`;
  yaml += `  version: "1.0"
`;
  yaml += `  exported_at: "${now}"
`;
  yaml += `  scoring_format: "${league.scoring || 'Half-PPR'}"
`;
  yaml += `  draft_type: "${league.format || 'Snake'}"
`;
  yaml += `  teams_count: ${league.teamsCount || 12}
`;
  yaml += `  user_draft_slot: ${league.userSlot || 1}
`;
  yaml += `  column_order:
`;
  positions.forEach(pos => {
    yaml += `    - ${pos}
`;
  });

  yaml += `
vertical_tier_gaps_px:
`;
  positions.forEach(pos => {
    yaml += `  ${pos}:
`;
    availableTiers.forEach(t => {
      yaml += `    tier_${t}: ${store.getTierGap(pos, t)}
`;
    });
  });

  yaml += `
positions:
`;
  positions.forEach(pos => {
    yaml += `  ${pos}:
`;
    availableTiers.forEach(t => {
      const tierPlayers = players.filter(p => p.pos === pos && (p.tier || 1) === t);
      const gapPx = store.getTierGap(pos, t);
      yaml += `    tier_${t}:
`;
      yaml += `      offset_gap_px: ${gapPx}
`;
      yaml += `      player_count: ${tierPlayers.length}
`;
      yaml += `      players:
`;
      if (tierPlayers.length === 0) {
        yaml += `        []
`;
      } else {
        tierPlayers.forEach((p, idx) => {
          const isDrafted = store.isPlayerDrafted(p.id);
          yaml += `        - rank_in_tier: ${idx + 1}
`;
          yaml += `          name: "${p.name.replace(/"/g, '\"')}"
`;
          yaml += `          team: "${p.team}"
`;
          yaml += `          bye: ${p.bye}
`;
          yaml += `          drafted: ${isDrafted}
`;
          yaml += `          projected_pts: ${p.projectedPts}
`;
          yaml += `          ecr: ${p.ecr}
`;
        });
      }
    });
  });

  return yaml;
}

export function renderPreDraftView() {
  const container = document.getElementById('view-predraft');
  if (!container) return;

  const state = store.getState();
  const { players } = state;

  // Position columns: TE is positioned directly to the right of WR
  const positions = ['RB', 'WR', 'TE', 'QB', 'DST', 'K'];
  const availableTiers = [1, 2, 3, 4, 5];

  let searchQuery = container.dataset.searchQuery || '';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <!-- Control Bar -->
      <div class="glass-card" style="padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff;">🏆 Positional Tier Board</h2>
            <p style="font-size: 0.8rem; color: var(--text-muted);">
              Check boxes to mark players drafted during live draft. Drag players to reorder within a tier. Adjust vertical gaps between tier blocks using the <strong>↕ Gap Handles</strong> or <strong>+/-</strong> buttons.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <input type="text" class="search-input" id="board-search" placeholder="🔍 Search player..." value="${searchQuery}">
            <button class="btn-secondary" id="btn-export-board" style="padding: 0.45rem 0.9rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer;" title="Export board with visual tier alignment to a local YAML file">
              📥 Export Board (YAML)
            </button>
          </div>
        </div>
      </div>

      <!-- Multi-Column Board with Adjustable Gaps -->
      <div class="position-columns-grid">
        ${positions.map(pos => {
          const posPlayers = players.filter(p => {
            const matchesPos = p.pos === pos;
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.team.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesPos && matchesSearch;
          });

          // Group players by tier while maintaining exact array order
          const tiersMap = {};
          availableTiers.forEach(t => { tiersMap[t] = []; });
          
          posPlayers.forEach(p => {
            const t = p.tier || 1;
            if (!tiersMap[t]) tiersMap[t] = [];
            tiersMap[t].push(p);
          });

          return `
            <div class="pos-column glass-card" data-pos="${pos}">
              <!-- Column Header -->
              <div class="pos-column-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="pos-badge pos-${pos.toLowerCase()}" style="font-size: 0.85rem; padding: 0.25rem 0.6rem;">${pos}</span>
                  <span style="font-weight: 800; font-size: 1rem; color: #fff;">${pos}</span>
                </div>
                <span class="tier-badge" style="font-size: 0.75rem;">${posPlayers.length} Players</span>
              </div>

              <!-- Quick Enter Player Name -->
              <div class="quick-add-box">
                <input type="text" class="search-input input-add-player" style="font-size: 0.8rem; padding: 0.35rem 0.6rem; width: 100%;" placeholder="+ Add ${pos}..." data-pos="${pos}">
                <button class="btn-primary btn-add-player" data-pos="${pos}" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;">Add</button>
              </div>

              <!-- Tier Blocks Container with Adjustable Gaps -->
              <div class="tier-blocks-column" data-pos="${pos}">
                ${availableTiers.map(tierNum => {
                  const gap = store.getTierGap(pos, tierNum);
                  const tierPlayers = tiersMap[tierNum] || [];

                  return `
                    <!-- Adjustable Vertical Gap Spacer -->
                    <div class="tier-gap-spacer ${tierNum === 1 ? 'tier-top-spacer' : ''}" data-pos="${pos}" data-tier="${tierNum}" style="height: ${gap}px;">
                      <div class="gap-control-bar" title="Drag vertically to resize gap, or click +/-">
                        <span class="gap-drag-handle">↕</span>
                        <span class="gap-label">${gap}px gap</span>
                        <div class="gap-btn-group">
                          <button class="btn-gap-dec" data-pos="${pos}" data-tier="${tierNum}" title="Decrease gap">-</button>
                          <button class="btn-gap-inc" data-pos="${pos}" data-tier="${tierNum}" title="Increase gap">+</button>
                        </div>
                      </div>
                    </div>

                    <!-- Tier Block Card -->
                    <div class="tier-box" data-pos="${pos}" data-tier="${tierNum}">
                      <div class="tier-box-header">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <span style="font-weight: 800; font-size: 0.8rem; color: var(--accent-primary);">TIER ${tierNum}</span>
                        </div>
                        <span class="tier-badge" style="font-size: 0.7rem;">${tierPlayers.length}</span>
                      </div>

                      <!-- Player Cards Drop Zone -->
                      <div class="player-drop-zone" data-pos="${pos}" data-tier="${tierNum}">
                        ${tierPlayers.length === 0 ? `
                          <div class="empty-tier-msg">Drop player here</div>
                        ` : ''}

                        ${tierPlayers.map((p, idx) => {
                          const isDrafted = store.isPlayerDrafted(p.id);
                          return `
                            <div class="draggable-player-card ${isDrafted ? 'card-drafted' : ''}" draggable="true" data-id="${p.id}" data-pos="${pos}" data-tier="${tierNum}" data-index="${idx}">
                              <div class="player-card-left">
                                <input type="checkbox" class="player-draft-chk" data-id="${p.id}" ${isDrafted ? 'checked' : ''} title="${isDrafted ? 'Drafted (click to unmark)' : 'Mark Drafted'}">
                                <div class="player-info">
                                  <span class="player-drag-dots" title="Drag to reorder">⋮⋮</span>
                                  <div>
                                    <div class="player-name ${isDrafted ? 'name-drafted' : ''}">
                                      ${p.name}
                                      ${isDrafted ? '<span class="drafted-badge">DRAFTED</span>' : ''}
                                    </div>
                                    <div class="player-team">${p.team} • Bye ${p.bye}</div>
                                  </div>
                                </div>
                              </div>

                              <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="font-size: 0.7rem; font-weight: 700; color: ${isDrafted ? '#64748b' : '#34d399'};"><span style="opacity:0.6;">#</span>${idx + 1}</span>
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Stat Table Section -->
      <div class="glass-card">
        <div class="card-title">
          <span>📊 Player Database & Rankings</span>
        </div>

        <div class="stat-table-wrapper">
          <table class="stat-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Pos</th>
                <th>Team</th>
                <th>Tier</th>
                <th>ECR</th>
                <th>Proj Pts</th>
                <th>Target Share</th>
                <th>RZ Touches</th>
                <th>Air Yards</th>
              </tr>
            </thead>
            <tbody>
              ${players.map((p, idx) => `
                <tr>
                  <td style="font-weight: 700; color: var(--accent-primary);">${idx + 1}</td>
                  <td style="font-weight: 700; color: #fff;">${p.name}</td>
                  <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                  <td>${p.team}</td>
                  <td><span class="tier-badge">T${p.tier}</span></td>
                  <td style="color: var(--text-muted);">${p.ecr}</td>
                  <td style="font-weight: 700; color: #34d399;">${p.projectedPts}</td>
                  <td>${p.targetShare}%</td>
                  <td>${p.redzoneTouches}</td>
                  <td>${p.airYardsShare}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // --- ATTACH EVENT LISTENERS ---

  // Search Filter
  const searchInput = container.querySelector('#board-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      container.dataset.searchQuery = e.target.value;
      renderPreDraftView();
    });
  }

  // Export Board (YAML) Button
  const btnExport = container.querySelector('#btn-export-board');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const yamlContent = generateBoardYaml(store.getState(), positions, availableTiers);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadFile(yamlContent, `fantasy_tier_board_${dateStr}.yaml`, 'text/yaml;charset=utf-8;');
    });
  }

  // Quick Add Player
  const handleAddPlayer = (pos, inputEl) => {
    const name = inputEl.value;
    if (name && name.trim()) {
      store.addCustomPlayer(name, pos, 'FA', 1);
      renderPreDraftView();
    }
  };

  container.querySelectorAll('.btn-add-player').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pos = e.currentTarget.dataset.pos;
      const inputEl = container.querySelector(`.input-add-player[data-pos="${pos}"]`);
      if (inputEl) handleAddPlayer(pos, inputEl);
    });
  });

  container.querySelectorAll('.input-add-player').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const pos = e.target.dataset.pos;
        handleAddPlayer(pos, e.target);
      }
    });
  });

  // Player Draft Checkboxes (Mark Drafted / Kept in Place)
  container.querySelectorAll('.player-draft-chk').forEach(chk => {
    chk.addEventListener('mousedown', (e) => e.stopPropagation());
    chk.addEventListener('click', (e) => e.stopPropagation());
    chk.addEventListener('change', async (e) => {
      e.stopPropagation();
      const playerId = e.target.dataset.id;
      await store.togglePlayerDrafted(playerId);
      renderPreDraftView();
    });
  });

  // --- ADJUSTABLE GAP BUTTONS & DRAGGING ---

  // 1. Plus / Minus Buttons
  container.querySelectorAll('.btn-gap-inc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pos = btn.dataset.pos;
      const tier = parseInt(btn.dataset.tier, 10);
      const curGap = store.getTierGap(pos, tier);
      store.setTierGap(pos, tier, curGap + 25);
      renderPreDraftView();
    });
  });

  container.querySelectorAll('.btn-gap-dec').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pos = btn.dataset.pos;
      const tier = parseInt(btn.dataset.tier, 10);
      const curGap = store.getTierGap(pos, tier);
      store.setTierGap(pos, tier, Math.max(0, curGap - 25));
      renderPreDraftView();
    });
  });

  // 2. Drag Spacer to Resize Gap in Real Time
  container.querySelectorAll('.gap-control-bar').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();

      const spacer = handle.closest('.tier-gap-spacer');
      const pos = spacer.dataset.pos;
      const tier = parseInt(spacer.dataset.tier, 10);
      const startY = e.clientY;
      const startHeight = spacer.offsetHeight;

      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const newHeight = Math.max(0, startHeight + deltaY);
        spacer.style.height = `${newHeight}px`;
        const label = spacer.querySelector('.gap-label');
        if (label) label.textContent = `${newHeight}px gap`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        const finalHeight = spacer.offsetHeight;
        store.setTierGap(pos, tier, finalHeight);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  // --- DRAG & DROP FOR PLAYERS (WITHIN TIER & ACROSS TIERS) ---

  let draggedPlayerId = null;

  // Player Cards
  container.querySelectorAll('.draggable-player-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.classList.contains('player-draft-chk')) {
        e.preventDefault();
        return;
      }
      draggedPlayerId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', draggedPlayerId);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      container.querySelectorAll('.draggable-player-card').forEach(c => {
        c.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
      });
      draggedPlayerId = null;
    });

    // Hover over other player cards to detect insert before / after
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedPlayerId || card.dataset.id === draggedPlayerId) return;

      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        card.classList.add('drop-indicator-top');
        card.classList.remove('drop-indicator-bottom');
      } else {
        card.classList.add('drop-indicator-bottom');
        card.classList.remove('drop-indicator-top');
      }
      e.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drop-indicator-top', 'drop-indicator-bottom');

      if (!draggedPlayerId || card.dataset.id === draggedPlayerId) return;

      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = (e.clientY < midY) ? 'before' : 'after';

      store.reorderPlayer(draggedPlayerId, card.dataset.id, position);
      renderPreDraftView();
    });
  });

  // Drop on empty tier zone or bottom of tier zone
  container.querySelectorAll('.player-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedPlayerId) {
        zone.classList.add('drop-hover');
        e.dataTransfer.dropEffect = 'move';
      }
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drop-hover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drop-hover');

      if (draggedPlayerId) {
        const targetPos = zone.dataset.pos;
        const targetTier = parseInt(zone.dataset.tier, 10);
        store.movePlayerToTierEnd(draggedPlayerId, targetPos, targetTier);
        renderPreDraftView();
      }
    });
  });
}
