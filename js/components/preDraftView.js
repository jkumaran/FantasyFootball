import { store } from '../store.js';

export function renderPreDraftView() {
  const container = document.getElementById('view-predraft');
  if (!container) return;

  const state = store.getState();
  const { players } = state;

  const positions = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

  let searchQuery = container.dataset.searchQuery || '';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Top Control Bar -->
      <div class="glass-card" style="padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff;">🏆 Positional Tier Board</h2>
            <p style="font-size: 0.8rem; color: var(--text-muted);">
              Drag & drop players between tiers or reorder tier boxes up and down. Enter new player names directly into any position column.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <input type="text" class="search-input" id="board-search" placeholder="🔍 Search player..." value="${searchQuery}">
          </div>
        </div>
      </div>

      <!-- Multi-Column Positional Tier Board -->
      <div class="position-columns-grid">
        ${positions.map(pos => {
          const posPlayers = players.filter(p => {
            const matchesPos = p.pos === pos;
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.team.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesPos && matchesSearch;
          });

          const tiersMap = {};
          const availableTiers = [1, 2, 3, 4, 5];
          availableTiers.forEach(t => { tiersMap[t] = []; });
          
          posPlayers.forEach(p => {
            const t = p.tier || 1;
            if (!tiersMap[t]) tiersMap[t] = [];
            tiersMap[t].push(p);
          });

          return `
            <div class="pos-column glass-card" data-pos="${pos}">
              <div class="pos-column-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="pos-badge pos-${pos.toLowerCase()}" style="font-size: 0.85rem; padding: 0.25rem 0.6rem;">${pos}</span>
                  <span style="font-weight: 800; font-size: 1rem; color: #fff;">${pos} Tiers</span>
                </div>
                <span class="tier-badge" style="font-size: 0.75rem;">${posPlayers.length} Players</span>
              </div>

              <div class="quick-add-box">
                <input type="text" class="search-input input-add-player" style="font-size: 0.8rem; padding: 0.35rem 0.6rem; width: 100%;" placeholder="+ Enter ${pos} name..." data-pos="${pos}">
                <button class="btn-primary btn-add-player" data-pos="${pos}" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;">Add</button>
              </div>

              <div class="tier-boxes-container" data-pos="${pos}">
                ${availableTiers.map(tierNum => `
                  <div class="tier-box" draggable="true" data-pos="${pos}" data-tier="${tierNum}">
                    <div class="tier-box-header">
                      <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span class="drag-handle-icon" title="Drag to reorder tier position">⋮⋮</span>
                        <span style="font-weight: 800; font-size: 0.8rem; color: var(--accent-primary);">TIER ${tierNum}</span>
                      </div>
                      <span class="tier-badge" style="font-size: 0.7rem;">${tiersMap[tierNum].length}</span>
                    </div>

                    <div class="player-drop-zone" data-pos="${pos}" data-tier="${tierNum}">
                      ${tiersMap[tierNum].length === 0 ? `
                        <div class="empty-tier-msg">Drag player here</div>
                      ` : ''}

                      ${tiersMap[tierNum].map((p, idx) => `
                        <div class="draggable-player-card" draggable="true" data-id="${p.id}" data-pos="${pos}" data-tier="${tierNum}" data-index="${idx}">
                          <div class="player-info">
                            <span class="player-drag-dots">⋮</span>
                            <div>
                              <div class="player-name">${p.name}</div>
                              <div class="player-team">${p.team} • Bye ${p.bye}</div>
                            </div>
                          </div>

                          <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="font-size: 0.7rem; font-weight: 700; color: #34d399;">#${p.customRank}</span>
                            <button class="btn-icon btn-delete-player" data-id="${p.id}" style="width: 1.25rem; height: 1.25rem; font-size: 0.65rem; padding: 0;">✕</button>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Stat Table & ECR Comparison Section -->
      <div class="glass-card">
        <div class="card-title">
          <span>📊 Full Player Stats & ECR Comparison</span>
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
                <th>My Rank</th>
                <th>Gap</th>
                <th>Proj Pts</th>
                <th>Target Share</th>
                <th>RZ Touches</th>
                <th>Air Yards</th>
              </tr>
            </thead>
            <tbody>
              ${players.map(p => {
                const diff = p.ecr - p.customRank;
                let gapBadge = '<span style="color: var(--text-dim);">-</span>';
                if (diff > 2) gapBadge = `<span class="diff-tag diff-sleeper">+${diff} Sleeper</span>`;
                else if (diff < -2) gapBadge = `<span class="diff-tag diff-reach">${diff} Reach</span>`;

                return `
                  <tr>
                    <td style="font-weight: 700; color: var(--accent-primary);">${p.customRank}</td>
                    <td style="font-weight: 700; color: #fff;">${p.name}</td>
                    <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                    <td>${p.team}</td>
                    <td><span class="tier-badge">T${p.tier}</span></td>
                    <td style="color: var(--text-muted);">${p.ecr}</td>
                    <td>
                      <input type="number" class="rank-input search-input" style="width: 55px; padding: 0.15rem 0.3rem; font-size: 0.8rem;" data-id="${p.id}" value="${p.customRank}">
                    </td>
                    <td>${gapBadge}</td>
                    <td style="font-weight: 700; color: #34d399;">${p.projectedPts}</td>
                    <td>${p.targetShare}%</td>
                    <td>${p.redzoneTouches}</td>
                    <td>${p.airYardsShare}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#board-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      container.dataset.searchQuery = e.target.value;
      renderPreDraftView();
    });
  }

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

  container.querySelectorAll('.rank-input').forEach(input => {
    input.addEventListener('change', (e) => {
      store.updatePlayerCustomRank(e.target.dataset.id, e.target.value);
    });
  });

  let draggedPlayerId = null;
  let draggedTierNum = null;
  let draggedPos = null;

  container.querySelectorAll('.draggable-player-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      draggedPlayerId = card.dataset.id;
      draggedPos = card.dataset.pos;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', draggedPlayerId);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedPlayerId = null;
    });
  });

  container.querySelectorAll('.player-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedPlayerId) {
        zone.classList.add('drop-hover');
        e.dataTransfer.dropEffect = 'move';
      }
    });

    zone.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      zone.classList.remove('drop-hover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drop-hover');

      const targetTier = parseInt(zone.dataset.tier, 10);
      if (draggedPlayerId && targetTier) {
        store.movePlayerToTier(draggedPlayerId, targetTier);
        renderPreDraftView();
      }
    });
  });

  container.querySelectorAll('.tier-box').forEach(tierBox => {
    tierBox.addEventListener('dragstart', (e) => {
      if (draggedPlayerId) return;
      draggedTierNum = parseInt(tierBox.dataset.tier, 10);
      draggedPos = tierBox.dataset.pos;
      tierBox.classList.add('tier-dragging');
      e.dataTransfer.setData('text/tier', draggedTierNum);
      e.dataTransfer.effectAllowed = 'move';
    });

    tierBox.addEventListener('dragend', () => {
      tierBox.classList.remove('tier-dragging');
      draggedTierNum = null;
    });

    tierBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedPlayerId && draggedTierNum && tierBox.dataset.pos === draggedPos) {
        tierBox.classList.add('tier-drop-hover');
      }
    });

    tierBox.addEventListener('dragleave', () => {
      tierBox.classList.remove('tier-drop-hover');
    });

    tierBox.addEventListener('drop', (e) => {
      e.preventDefault();
      tierBox.classList.remove('tier-drop-hover');
      const targetTier = parseInt(tierBox.dataset.tier, 10);

      if (!draggedPlayerId && draggedTierNum && targetTier && draggedTierNum !== targetTier) {
        store.reorderTiers(draggedPos, draggedTierNum, targetTier);
        renderPreDraftView();
      }
    });
  });
}
