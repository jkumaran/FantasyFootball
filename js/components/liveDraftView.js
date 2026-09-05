import { store } from '../store.js';
import { getDraftRecommendations } from '../engine/draftAssistant.js';
import { renderAuthModal } from './authModal.js';

export function renderLiveDraftView() {
  const container = document.getElementById('view-livedraft');
  if (!container) return;

  const state = store.getState();
  const { players, draftPicks, currentPick, league, userRoster } = state;
  const teamsCount = league.teamsCount || 12;
  const userSlot = league.userSlot || 1;

  const assistantData = getDraftRecommendations(state);
  const { topRecommendations, picksUntilNextUserPick, isUserTurn, scarcityAlert, availabilityMap } = assistantData;

  const draftedIds = new Set(draftPicks.map(dp => dp.player.id));
  const availablePlayers = players
    .filter(p => !draftedIds.has(p.id))
    .sort((a, b) => (a.customRank || a.ecr) - (b.customRank || b.ecr));

  const round = Math.ceil(currentPick / teamsCount);
  const pickInRound = ((currentPick - 1) % teamsCount) + 1;

  const totalRounds = 16;
  const gridCells = [];

  for (let r = 1; r <= totalRounds; r++) {
    for (let t = 1; t <= teamsCount; t++) {
      let pickNum;
      if (r % 2 === 1) {
        pickNum = (r - 1) * teamsCount + t;
      } else {
        pickNum = (r - 1) * teamsCount + (teamsCount - t + 1);
      }

      const matchPick = draftPicks.find(dp => dp.pickNum === pickNum);
      gridCells.push({
        round: r,
        teamId: t,
        pickNum,
        player: matchPick ? matchPick.player : null,
        isCurrent: pickNum === currentPick,
        isUserTeam: t === userSlot
      });
    }
  }

  const userTeamPlayers = players.filter(p => userRoster.includes(p.id));

  container.innerHTML = `
    <div class="warroom-layout">
      <!-- Left Column: Real-Time AI Draft Assistant -->
      <div class="assistant-panel">
        <div class="glass-card" style="border-color: ${isUserTurn ? 'var(--accent-primary)' : 'var(--border-color)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">CURRENT PICK</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: #fff;">Round ${round} • Pick ${pickInRound}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Overall Pick #${currentPick} (Half-PPR Snake)</div>
            </div>
            ${isUserTurn ? `
              <span class="pos-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 0.85rem; padding: 0.4rem 0.75rem;">
                🎯 YOUR TURN TO PICK!
              </span>
            ` : `
              <span style="font-size: 0.8rem; color: var(--text-muted);">
                ${picksUntilNextUserPick} picks until your turn
              </span>
            `}
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button class="btn-secondary" id="btn-undo-pick" ${draftPicks.length === 0 ? 'disabled' : ''}>
              ↩️ Undo Pick
            </button>
            <button class="btn-danger" id="btn-reset-draft">
              🔄 Reset Draft
            </button>
          </div>
        </div>

        ${scarcityAlert ? `
          <div class="glass-card" style="background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3);">
            <div style="font-size: 0.85rem; font-weight: 700; color: #fbbf24;">
              ${scarcityAlert.text}
            </div>
          </div>
        ` : ''}

        <div class="glass-card">
          <div class="card-title">
            <span>🤖 AI Draft Recommender</span>
            <span style="font-size: 0.75rem; color: #818cf8;">VORP + Availability Forecaster</span>
          </div>

          ${topRecommendations.length === 0 ? '<p style="color: var(--text-dim);">No remaining recommendations.</p>' : ''}

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${topRecommendations.map((rec, idx) => {
              const p = rec.player;
              const odds = rec.survivalOdds;
              let oddsClass = 'survival-high';
              if (odds < 35) oddsClass = 'survival-low';
              else if (odds < 70) oddsClass = 'survival-med';

              return `
                <div class="recommendation-card" style="${idx === 0 ? 'border-color: var(--accent-primary);' : ''}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <div class="rec-rank">#${idx + 1} RECOMMENDED PICK</div>
                      <div class="rec-name">${p.name}</div>
                      <div class="rec-meta">
                        <span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span>
                        <span class="player-team">${p.team} • Bye ${p.bye}</span>
                        <span class="metric-badge" style="color: #34d399;">VORP: +${rec.vorp}</span>
                      </div>
                    </div>
                    <button class="btn-primary btn-draft-player" data-id="${p.id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                      Draft Player
                    </button>
                  </div>

                  <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem;">
                    <div style="font-size: 0.75rem; color: var(--text-dim);">
                      Next Round Survival Odds:
                    </div>
                    <span class="survival-badge ${oddsClass}">
                      ${odds}% Chance to survive
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Center Column: Available Pool & Live Board -->
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div class="glass-card">
          <div class="card-title">
            <span>⚡ Available Players Pool</span>
            <span style="font-size: 0.8rem; color: var(--text-dim);">${availablePlayers.length} Available</span>
          </div>

          <div class="stat-table-wrapper" style="max-height: 280px; overflow-y: auto;">
            <table class="stat-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>Proj Pts</th>
                  <th>Survival Odds</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${availablePlayers.slice(0, 20).map(p => {
                  const odds = availabilityMap[p.id] !== undefined ? availabilityMap[p.id] : 50;
                  let oddsClass = 'survival-high';
                  if (odds < 35) oddsClass = 'survival-low';
                  else if (odds < 70) oddsClass = 'survival-med';

                  return `
                    <tr>
                      <td style="font-weight: 700; color: var(--accent-primary);">${p.customRank || p.ecr}</td>
                      <td style="font-weight: 700; color: #fff;">${p.name}</td>
                      <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                      <td>${p.team}</td>
                      <td style="color: #34d399; font-weight: 700;">${p.projectedPts}</td>
                      <td><span class="survival-badge ${oddsClass}">${odds}%</span></td>
                      <td>
                        <button class="btn-primary btn-draft-player" data-id="${p.id}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                          Draft
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-card">
          <div class="card-title">
            <span>📋 Draft Board (12 Teams • Snake)</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">Pick ${currentPick} of 192</span>
          </div>

          <div class="draft-board-container">
            <div class="draft-grid" style="margin-bottom: 0.4rem;">
              ${Array.from({ length: teamsCount }, (_, i) => i + 1).map(t => `
                <div style="font-weight: 800; font-size: 0.75rem; text-align: center; color: ${t === userSlot ? '#34d399' : 'var(--text-muted)'}; background: rgba(255,255,255,0.03); padding: 0.3rem; border-radius: var(--radius-sm);">
                  ${t === userSlot ? '⭐ Team ' + t : 'Team ' + t}
                </div>
              `).join('')}
            </div>

            <div class="draft-grid">
              ${gridCells.map(cell => `
                <div class="draft-cell ${cell.isCurrent ? 'current-pick' : ''} ${cell.isUserTeam ? 'user-pick' : ''}">
                  <div class="cell-pick-num">${cell.round}.${((cell.pickNum - 1) % teamsCount) + 1} (#${cell.pickNum})</div>
                  ${cell.player ? `
                    <div class="cell-player-name">${cell.player.name}</div>
                    <div><span class="pos-badge pos-${cell.player.pos.toLowerCase()}" style="font-size: 0.65rem; padding: 0.05rem 0.25rem;">${cell.player.pos}</span></div>
                  ` : `
                    <div style="color: var(--text-dim); font-size: 0.7rem;">-</div>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: User Roster Breakdown -->
      <div class="glass-card">
        <div class="card-title">
          <span>🛡️ Your Roster</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${userTeamPlayers.length} Players</span>
        </div>

        <div class="roster-list">
          ${['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'].map((slot, idx) => {
            let player = null;
            if (slot === 'QB') player = userTeamPlayers.find(p => p.pos === 'QB');
            else if (slot === 'RB') {
              const rbs = userTeamPlayers.filter(p => p.pos === 'RB');
              player = idx === 1 ? rbs[0] : rbs[1];
            } else if (slot === 'WR') {
              const wrs = userTeamPlayers.filter(p => p.pos === 'WR');
              player = idx === 3 ? wrs[0] : wrs[1];
            } else if (slot === 'TE') player = userTeamPlayers.find(p => p.pos === 'TE');
            else if (slot === 'DST') player = userTeamPlayers.find(p => p.pos === 'DST');
            else if (slot === 'K') player = userTeamPlayers.find(p => p.pos === 'K');
            else if (slot === 'FLEX') {
              const flexRbsWrsTes = userTeamPlayers.filter(p => ['RB', 'WR', 'TE'].includes(p.pos));
              player = flexRbsWrsTes[2] || null;
            }

            return `
              <div class="roster-slot-row">
                <span class="slot-label">${slot}</span>
                ${player ? `
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="pos-badge pos-${player.pos.toLowerCase()}">${player.pos}</span>
                    <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">${player.name}</span>
                  </div>
                ` : `
                  <span style="color: var(--text-dim); font-size: 0.8rem;">Empty</span>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-draft-player').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      const pid = e.currentTarget.dataset.id;
      store.draftPlayer(pid);
    });
  });

  const btnUndo = container.querySelector('#btn-undo-pick');
  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      store.undoLastPick();
    });
  }

  const btnReset = container.querySelector('#btn-reset-draft');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      if (confirm('Are you sure you want to reset the draft board?')) {
        store.resetDraft();
      }
    });
  }
}
