import { store } from '../store.js';

export function renderPreDraftView() {
  const container = document.getElementById('view-predraft');
  if (!container) return;

  const state = store.getState();
  const { players } = state;

  const positions = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];
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
              Drag players up & down within a tier to reorder them. Adjust vertical gaps between tier blocks using the <strong>↕ Gap Handles</strong> or <strong>+/-</strong> buttons.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <input type="text" class="search-input" id="board-search" placeholder="🔍 Search player..." value="${searchQuery}">
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

                        ${tierPlayers.map((p, idx) => `
                          <div class="draggable-player-card" draggable="true" data-id="${p.id}" data-pos="${pos}" data-tier="${tierNum}" data-index="${idx}">
                            <div class="player-info">
                              <span class="player-drag-dots">⋮⋮</span>
                              <div>
                                <div class="player-name">${p.name}</div>
                                <div class="player-team">${p.team} • Bye ${p.bye}</div>
                              </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                              <span style="font-size: 0.7rem; font-weight: 700; color: #34d399;">#${idx + 1}</span>
                            </div>
                          </div>
                        `).join('')}
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
      // Ignore clicks on buttons
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

      const onMouseUp = (upEvent) => {
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
