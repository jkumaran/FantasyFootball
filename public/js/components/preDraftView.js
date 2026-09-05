import { store } from '../store.js';

export function renderPreDraftView() {
  const container = document.getElementById('view-predraft');
  if (!container) return;

  const state = store.getState();
  const { players } = state;

  let activePos = container.dataset.activePos || 'ALL';
  let searchQuery = container.dataset.searchQuery || '';

  let filtered = players.filter(p => {
    const matchesPos = (activePos === 'ALL') || (p.pos === activePos);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPos && matchesSearch;
  });

  const tiersMap = {};
  filtered.forEach(p => {
    const t = p.tier || 1;
    if (!tiersMap[t]) tiersMap[t] = [];
    tiersMap[t].push(p);
  });

  const tierKeys = Object.keys(tiersMap).map(Number).sort((a, b) => a - b);

  container.innerHTML = `
    <div class="predraft-layout">
      <!-- Tier List Column -->
      <div class="glass-card">
        <div class="card-title">
          <span>🏆 Tier Manager</span>
          <span style="font-size: 0.75rem; color: var(--text-dim);">${filtered.length} Players</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
          Assign custom tiers to group players by value level before draft day.
        </p>

        <div class="tier-list-container">
          ${tierKeys.length === 0 ? '<p style="color: var(--text-dim); font-size: 0.85rem;">No players found for current filter.</p>' : ''}
          ${tierKeys.map(tierNum => `
            <div class="tier-group">
              <div class="tier-header">
                <span>TIER ${tierNum}</span>
                <span class="tier-badge">${tiersMap[tierNum].length} Players</span>
              </div>
              <div class="tier-players">
                ${tiersMap[tierNum].map(p => `
                  <div class="player-mini-card">
                    <div class="player-info">
                      <span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span>
                      <div>
                        <div class="player-name">${p.name}</div>
                        <div class="player-team">${p.team} • Bye ${p.bye}</div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <select class="tier-select btn-secondary" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" data-id="${p.id}">
                        ${[1, 2, 3, 4, 5].map(t => `<option value="${t}" ${t === p.tier ? 'selected' : ''}>T${t}</option>`).join('')}
                      </select>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Stat Table & ECR Comparison Column -->
      <div class="glass-card">
        <div class="card-title">
          <span>📊 Player Stats & Ranking Gaps</span>
        </div>

        <div class="filter-bar">
          <input type="text" class="search-input" id="predraft-search" placeholder="Search player or team..." value="${searchQuery}">
          
          <div style="display: flex; gap: 0.25rem;">
            ${['ALL', 'QB', 'RB', 'WR', 'TE', 'DST', 'K'].map(pos => `
              <button class="filter-btn ${activePos === pos ? 'active' : ''}" data-pos="${pos}">${pos}</button>
            `).join('')}
          </div>
        </div>

        <div class="stat-table-wrapper">
          <table class="stat-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Pos</th>
                <th>Team</th>
                <th>ECR</th>
                <th>My Rank</th>
                <th>Gap</th>
                <th>Proj Pts</th>
                <th>Target Share</th>
                <th>RZ Touches</th>
                <th>Air Yards</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => {
                const diff = p.ecr - p.customRank;
                let gapBadge = '<span style="color: var(--text-dim);">-</span>';
                if (diff > 2) {
                  gapBadge = `<span class="diff-tag diff-sleeper">+${diff} Sleeper</span>`;
                } else if (diff < -2) {
                  gapBadge = `<span class="diff-tag diff-reach">${diff} Reach</span>`;
                }

                return `
                  <tr>
                    <td style="font-weight: 700; color: var(--accent-primary);">${p.customRank}</td>
                    <td style="font-weight: 700; color: #fff;">${p.name}</td>
                    <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                    <td>${p.team}</td>
                    <td style="color: var(--text-muted);">${p.ecr}</td>
                    <td>
                      <input type="number" class="rank-input search-input" style="width: 55px; padding: 0.15rem 0.3rem; font-size: 0.8rem;" data-id="${p.id}" value="${p.customRank}">
                    </td>
                    <td>${gapBadge}</td>
                    <td style="font-weight: 700; color: #34d399;">${p.projectedPts}</td>
                    <td>${p.targetShare}%</td>
                    <td>${p.redzoneTouches}</td>
                    <td>${p.airYardsShare}%</td>
                    <td style="font-size: 0.75rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis;">${p.notes || ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.dataset.activePos = e.target.dataset.pos;
      renderPreDraftView();
    });
  });

  const searchInput = container.querySelector('#predraft-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      container.dataset.searchQuery = e.target.value;
      renderPreDraftView();
    });
  }

  container.querySelectorAll('.tier-select').forEach(select => {
    select.addEventListener('change', (e) => {
      store.updatePlayerTier(e.target.dataset.id, e.target.value);
    });
  });

  container.querySelectorAll('.rank-input').forEach(input => {
    input.addEventListener('change', (e) => {
      store.updatePlayerCustomRank(e.target.dataset.id, e.target.value);
    });
  });
}
