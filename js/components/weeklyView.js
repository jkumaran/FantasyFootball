/**
 * Weekly Matchup Command Center Component
 * Start/Sit Optimizer, Conservative vs Aggressive strategy mode toggle, and Waiver Wire recommendations.
 */
import { store } from '../store.js';
import { optimizeWeeklyLineup } from '../engine/weeklyOptimizer.js';

export function renderWeeklyView() {
  const container = document.getElementById('view-weekly');
  if (!container) return;

  const state = store.getState();
  const weeklyData = optimizeWeeklyLineup(state);
  const {
    optimalStarters,
    bench,
    teamProjected,
    teamFloor,
    teamCeiling,
    opponentProjected,
    winProb,
    recommendedStrategy,
    strategyReason,
    waiverRecommendations
  } = weeklyData;

  const currentStrategy = state.weeklyStrategy || 'CONSERVATIVE';

  container.innerHTML = `
    <div class="weekly-layout">
      <!-- Left Column: Matchup & Lineup Optimizer -->
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Strategy Profile Toggle Box -->
        <div class="strategy-toggle-box">
          <div>
            <div style="font-size: 1rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
              <span>🎯 Team Risk Profile Strategy</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
              ${strategyReason}
            </p>
          </div>

          <div class="strategy-btn-group">
            <button class="strat-btn conservative ${currentStrategy === 'CONSERVATIVE' ? 'active' : ''}" id="strat-conservative">
              🛡️ Conservative (Floor)
            </button>
            <button class="strat-btn aggressive ${currentStrategy === 'AGGRESSIVE' ? 'active' : ''}" id="strat-aggressive">
              ⚡ Aggressive (Ceiling)
            </button>
          </div>
        </div>

        <!-- Matchup Score Bar -->
        <div class="glass-card matchup-score-bar">
          <div class="team-score-block">
            <div style="font-size: 0.75rem; color: #818cf8; font-weight: 800;">YOUR TEAM PROJECTION</div>
            <div class="team-score-num">${teamProjected} <span style="font-size: 0.85rem; color: var(--text-dim);">pts</span></div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Floor: ${teamFloor} • Ceiling: ${teamCeiling}
            </div>
          </div>

          <div class="win-prob-indicator">
            <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">WIN PROBABILITY</div>
            <div class="win-prob-val" style="color: ${winProb >= 50 ? '#34d399' : '#f87171'};">
              ${winProb}%
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              ${winProb >= 50 ? 'Favored to Win' : 'Underdog Risk'}
            </div>
          </div>

          <div class="team-score-block">
            <div style="font-size: 0.75rem; color: #f87171; font-weight: 800;">OPPONENT PROJECTION</div>
            <div class="team-score-num">${opponentProjected} <span style="font-size: 0.85rem; color: var(--text-dim);">pts</span></div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Expected Score</div>
          </div>
        </div>

        <!-- Lineup Starters Table -->
        <div class="glass-card">
          <div class="card-title">
            <span>🏟️ Recommended Starting Lineup (${currentStrategy} MODE)</span>
            <button class="btn-primary" id="btn-auto-optimize" style="padding: 0.3rem 0.75rem; font-size: 0.8rem;">
              ⚡ Set Optimal Lineup
            </button>
          </div>

          <div class="stat-table-wrapper">
            <table class="stat-table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Matchup</th>
                  <th>Grade</th>
                  <th>Floor</th>
                  <th>Proj Pts</th>
                  <th>Ceiling</th>
                </tr>
              </thead>
              <tbody>
                ${optimalStarters.map((p, idx) => {
                  let slotName = p.pos;
                  if (idx === 1 && p.pos === 'RB') slotName = 'RB1';
                  if (idx === 2 && p.pos === 'RB') slotName = 'RB2';
                  if (idx === 3 && p.pos === 'WR') slotName = 'WR1';
                  if (idx === 4 && p.pos === 'WR') slotName = 'WR2';
                  if (idx === 4 && ['RB', 'WR', 'TE'].includes(p.pos)) slotName = 'FLEX';

                  return `
                    <tr>
                      <td style="font-weight: 800; color: var(--text-dim);">${slotName}</td>
                      <td style="font-weight: 700; color: #fff;">${p.name}</td>
                      <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                      <td style="font-size: 0.8rem; color: var(--text-muted);">vs ${p.opponent}</td>
                      <td>
                        <span class="metric-badge" style="color: ${p.matchupGrade.includes('A') ? '#34d399' : p.matchupGrade.includes('B') ? '#fbbf24' : '#f87171'};">
                          ${p.matchupGrade}
                        </span>
                      </td>
                      <td style="color: var(--text-muted);">${p.weeklyFloor}</td>
                      <td style="font-weight: 800; color: #34d399;">${p.weeklyProj}</td>
                      <td style="color: #818cf8; font-weight: 700;">${p.weeklyCeiling}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bench Table -->
        <div class="glass-card">
          <div class="card-title">
            <span>🛋️ Bench</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">${bench.length} Reserves</span>
          </div>

          <div class="stat-table-wrapper">
            <table class="stat-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Matchup</th>
                  <th>Floor</th>
                  <th>Proj Pts</th>
                  <th>Ceiling</th>
                </tr>
              </thead>
              <tbody>
                ${bench.length === 0 ? '<tr><td colspan="6" style="color: var(--text-dim);">No bench players.</td></tr>' : ''}
                ${bench.map(p => `
                  <tr style="opacity: 0.85;">
                    <td style="font-weight: 600; color: #fff;">${p.name}</td>
                    <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">vs ${p.opponent}</td>
                    <td>${p.weeklyFloor}</td>
                    <td style="font-weight: 700; color: #34d399;">${p.weeklyProj}</td>
                    <td style="color: #818cf8;">${p.weeklyCeiling}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Waiver Wire & Add/Drop Recommendations -->
      <div class="glass-card">
        <div class="card-title">
          <span>📡 Waiver Wire Radar</span>
          <span style="font-size: 0.75rem; color: var(--color-success);">Top Targets</span>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
          Recommended free agents with emerging target share, favorable upcoming matchups, and upside.
        </p>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${waiverRecommendations.map((fa, idx) => `
            <div class="player-mini-card" style="padding: 0.75rem;">
              <div class="player-info">
                <span class="pos-badge pos-${fa.pos.toLowerCase()}">${fa.pos}</span>
                <div>
                  <div class="player-name">${fa.name}</div>
                  <div class="player-team">${fa.team} • vs ${fa.opponent} (${fa.matchupGrade})</div>
                  <div style="font-size: 0.75rem; color: #34d399; font-weight: 700; margin-top: 0.15rem;">
                    Target Share: ${fa.targetShare}% • Upside: ${fa.upsideScore}
                  </div>
                </div>
              </div>
              <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                + Add Target
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const btnCon = container.querySelector('#strat-conservative');
  const btnAgg = container.querySelector('#strat-aggressive');

  if (btnCon) {
    btnCon.addEventListener('click', () => {
      store.setWeeklyStrategy('CONSERVATIVE');
      renderWeeklyView();
    });
  }

  if (btnAgg) {
    btnAgg.addEventListener('click', () => {
      store.setWeeklyStrategy('AGGRESSIVE');
      renderWeeklyView();
    });
  }
}
