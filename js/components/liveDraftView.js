import { store } from '../store.js';
import { getDraftRecommendations } from '../engine/draftAssistant.js';
import { renderAuthModal } from './authModal.js';

let isPollingStarted = false;

function ensurePolling() {
  if (isPollingStarted) return;
  isPollingStarted = true;
  setInterval(() => {
    const el = document.getElementById('view-livedraft');
    if (el && el.offsetParent !== null && !el.classList.contains('hidden')) {
      store.pollDraftUpdates();
    }
  }, 2500);
}

export function renderLiveDraftView() {
  ensurePolling();

  const container = document.getElementById('view-livedraft');
  if (!container) return;

  const state = store.getState();
  const { players, draftPicks, currentPick, league, userRoster, draftSessions, activeDraftSessionId } = state;
  const teamsCount = league.teamsCount || 12;
  const userSlot = league.userSlot || 1;

  // Available draft sessions (fallback defaults if backend hasn't populated yet)
  const defaultSessions = [
    { id: 'yahoo-1', name: 'Yahoo: League 1 (1548819)', platform: 'yahoo', leagueId: '1548819', teamsCount: 12, userSlot: 1 },
    { id: 'yahoo-1275807', name: 'Yahoo: League 2 (1275807)', platform: 'yahoo', leagueId: '1275807', teamsCount: 12, userSlot: 1 },
    { id: 'espn-2', name: 'ESPN: League 2', platform: 'espn', teamsCount: 10, userSlot: 4 },
    { id: 'sleeper-3', name: 'Sleeper: League 3', platform: 'sleeper', teamsCount: 12, userSlot: 2 },
    { id: 'mock', name: 'Manual / Mock', platform: 'manual', teamsCount: 12, userSlot: 1 }
  ];
  const sessions = (draftSessions && draftSessions.length > 0) ? draftSessions : defaultSessions;
  const activeSessionId = activeDraftSessionId || sessions[0]?.id || 'yahoo-1';
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

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

  // Platform icon helper
  const getPlatformIcon = (plat) => {
    switch ((plat || '').toLowerCase()) {
      case 'yahoo': return '🟣';
      case 'espn': return '🔴';
      case 'sleeper': return '🔵';
      default: return '🎲';
    }
  };

  const linkedId = currentSession?.leagueId || (currentSession?.id?.includes('1548819') ? '1548819' : '1548819');
  const actualDraftRoomUrl = (linkedId === '1548819')
    ? 'https://football.fantasysports.yahoo.com/draftclient/f1/1548819/8?auth=4abeae969ecfd710'
    : (currentSession?.draftUrl || `https://football.fantasysports.yahoo.com/f1/${linkedId}`);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <!-- Sticky Top Draft Options & Multi-League Selection Bar -->
      <div class="glass-card" style="padding: 0.5rem 0.85rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem; position: sticky; top: 3.8rem; z-index: 95; backdrop-filter: blur(16px); background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        
        <!-- Group 1: Thin Dotted Box for Draft Options / Leagues -->
        <div style="display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.45rem; border: 1px dashed rgba(255, 255, 255, 0.25); border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.02); flex-wrap: wrap;">
          <span style="font-size: 0.68rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; margin-right: 0.2rem; letter-spacing: 0.5px;">DRAFT ROOMS:</span>
          ${sessions.map(s => {
            const isActive = s.id === activeSessionId;
            const icon = getPlatformIcon(s.platform);
            const effectiveLid = s.leagueId || (s.id === 'yahoo-1' ? '1548819' : null);
            const displayName = effectiveLid && !s.name.includes(effectiveLid) ? `${s.name} (${effectiveLid})` : s.name;
            return `
              <button class="btn-secondary btn-switch-session" data-id="${s.id}" style="padding: 0.28rem 0.65rem; font-size: 0.76rem; font-weight: 700; ${isActive ? 'background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; color: #fff; box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);' : 'color: var(--text-muted);'}">
                ${icon} ${displayName} ${isActive ? '<span style="color: #38bdf8; font-size: 0.68rem; margin-left: 3px;">●</span>' : ''}
              </button>
            `;
          }).join('')}
          <button class="btn-secondary" id="btn-add-session" style="padding: 0.28rem 0.6rem; font-size: 0.74rem; font-weight: 700; color: #34d399; border-color: rgba(52, 211, 153, 0.3);">
            ➕ New League
          </button>
        </div>

        <!-- Group 2: Real-Time Chrome Extension Bridge Status -->
        <div style="display: flex; align-items: center; gap: 0.45rem; padding: 0.25rem 0.5rem; border: 1px dashed ${state.bridgeConnected ? 'rgba(52, 211, 153, 0.6)' : 'rgba(251, 191, 36, 0.5)'}; border-radius: var(--radius-sm); background: ${state.bridgeConnected ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 191, 36, 0.05)'}; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="width: 9px; height: 9px; border-radius: 50%; background: ${state.bridgeConnected ? '#34d399' : '#fbbf24'}; box-shadow: 0 0 8px ${state.bridgeConnected ? '#34d399' : '#fbbf24'}; animation: pulse 1.5s infinite;"></span>
            <span style="font-size: 0.74rem; font-weight: 700; color: ${state.bridgeConnected ? '#34d399' : '#fde68a'};">
              ${state.bridgeConnected 
                ? `🟢 Yahoo Connected (${state.bridgeLeagueId ? '#' + state.bridgeLeagueId : currentSession?.leagueId ? '#' + currentSession.leagueId : '#1548819'}) • Slot #8`
                : `🟡 Yahoo Bridge Waiting...`}
            </span>
          </div>
          <a href="${actualDraftRoomUrl}" target="_blank" class="btn-primary" style="padding: 0.24rem 0.65rem; font-size: 0.72rem; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #0284c7, #2563eb); border: 1px solid #38bdf8;">
            ⚡ Open Draft Room ↗
          </a>
          <button class="btn-secondary" id="btn-extension-guide" style="padding: 0.24rem 0.55rem; font-size: 0.72rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.1);">
            🔌 Extension Bridge
          </button>
        </div>

        <!-- Group 3: Thin Dotted Box for Draft Controls -->
        <div style="display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.45rem; border: 1px dashed rgba(255, 255, 255, 0.25); border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.02);">
          <button class="btn-secondary" id="btn-top-undo-pick" style="padding: 0.28rem 0.6rem; font-size: 0.74rem; font-weight: 700;" ${draftPicks.length === 0 ? 'disabled' : ''}>
            ↩️ Undo
          </button>
          <button class="btn-danger" id="btn-top-reset-draft" style="padding: 0.28rem 0.6rem; font-size: 0.74rem; font-weight: 700;">
            🔄 Reset
          </button>
          <button class="btn-secondary" id="btn-league-settings" style="padding: 0.28rem 0.6rem; font-size: 0.74rem; font-weight: 700;">
            ⚙️ Settings
          </button>
        </div>
      </div>

      <!-- Main War Room Layout -->
      <div class="warroom-layout">
        <!-- Left Column: Real-Time AI Draft Assistant -->
        <div class="assistant-panel">
          <div class="glass-card" style="border-color: ${isUserTurn ? 'var(--accent-primary)' : 'var(--border-color)'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">
                  CURRENT PICK • ${currentSession?.name || 'Yahoo: League 1'} ${currentSession?.leagueId || (currentSession?.id === 'yahoo-1' ? '(Yahoo #1548819)' : '')}
                </div>
                <div style="font-size: 1.4rem; font-weight: 900; color: #fff;">Round ${round} • Pick ${pickInRound}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Overall Pick #${currentPick} (${currentSession?.scoring || 'Half-PPR'} Snake • ${teamsCount} Teams)</div>
              </div>
              ${isUserTurn ? `
                <span class="pos-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 0.85rem; padding: 0.4rem 0.75rem;">
                  🎯 YOUR TURN TO PICK!
                </span>
              ` : `
                <span style="font-size: 0.8rem; color: var(--text-muted);">
                  ${picksUntilNextUserPick} picks until your turn (Slot #${userSlot})
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
              <span>📋 Draft Board (${teamsCount} Teams • Snake)</span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">Pick ${currentPick} of ${teamsCount * totalRounds}</span>
            </div>

            <div class="draft-board-container">
              <div class="draft-grid" style="grid-template-columns: repeat(${teamsCount}, minmax(80px, 1fr)); margin-bottom: 0.4rem;">
                ${Array.from({ length: teamsCount }, (_, i) => i + 1).map(t => `
                  <div style="font-weight: 800; font-size: 0.75rem; text-align: center; color: ${t === userSlot ? '#34d399' : 'var(--text-muted)'}; background: rgba(255,255,255,0.03); padding: 0.3rem; border-radius: var(--radius-sm);">
                    ${t === userSlot ? '⭐ Team ' + t : 'Team ' + t}
                  </div>
                `).join('')}
              </div>

              <div class="draft-grid" style="grid-template-columns: repeat(${teamsCount}, minmax(80px, 1fr));">
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
    </div>
  `;

  // Attach Event Listeners
  container.querySelectorAll('.btn-switch-session').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sid = e.currentTarget.dataset.id;
      store.switchDraftSession(sid);
    });
  });

  const btnAddSession = container.querySelector('#btn-add-session');
  if (btnAddSession) {
    btnAddSession.addEventListener('click', () => {
      openAddSessionModal();
    });
  }

  const btnExtensionGuide = container.querySelector('#btn-extension-guide');
  if (btnExtensionGuide) {
    btnExtensionGuide.addEventListener('click', () => {
      openExtensionHelpModal(currentSession);
    });
  }

  const btnLeagueSettings = container.querySelector('#btn-league-settings');
  if (btnLeagueSettings) {
    btnLeagueSettings.addEventListener('click', () => {
      openLeagueSettingsModal(currentSession);
    });
  }

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
  const btnTopUndo = container.querySelector('#btn-top-undo-pick');
  [btnUndo, btnTopUndo].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (!store.getState().isAuthenticated) {
          renderAuthModal();
          return;
        }
        store.undoLastPick();
      });
    }
  });

  const btnReset = container.querySelector('#btn-reset-draft');
  const btnTopReset = container.querySelector('#btn-top-reset-draft');
  [btnReset, btnTopReset].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (!store.getState().isAuthenticated) {
          renderAuthModal();
          return;
        }
        if (confirm(`Are you sure you want to reset the draft board for "${currentSession?.name || 'this league'}"?`)) {
          store.resetDraft();
        }
      });
    }
  });
}

function openAddSessionModal() {
  const existing = document.getElementById('modal-add-session');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-add-session';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 460px; width: 92%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="margin: 0; color: #fff; font-size: 1.15rem; font-weight: 800;">➕ Add Fantasy League Draft</h3>
        <button id="close-add-modal" style="background: transparent; border: none; color: var(--text-dim); font-size: 1.2rem; cursor: pointer;">✕</button>
      </div>
      <form id="form-add-session" style="display: flex; flex-direction: column; gap: 0.9rem;">
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">LEAGUE URL OR ID (OPTIONAL)</label>
          <input type="text" id="session-league-url" placeholder="e.g. 1548819 or paste Yahoo invite link" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;" />
        </div>
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">LEAGUE / DRAFT NAME</label>
          <input type="text" id="session-name" required placeholder="e.g. Yahoo: League 1548819" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;" />
        </div>
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">DRAFT PLATFORM</label>
          <select id="session-platform" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;">
            <option value="yahoo" selected>🟣 Yahoo Fantasy</option>
            <option value="espn">🔴 ESPN Fantasy</option>
            <option value="sleeper">🔵 Sleeper Fantasy</option>
            <option value="manual">🎲 Manual / Mock Draft</option>
          </select>
        </div>
        <div style="display: flex; gap: 0.8rem;">
          <div style="flex: 1;">
            <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">NUMBER OF TEAMS</label>
            <select id="session-teams" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;">
              <option value="8">8 Teams</option>
              <option value="10">10 Teams</option>
              <option value="12" selected>12 Teams</option>
              <option value="14">14 Teams</option>
              <option value="16">16 Teams</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">YOUR DRAFT SLOT</label>
            <input type="number" id="session-slot" min="1" max="16" value="1" required style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;" />
          </div>
        </div>
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">SCORING FORMAT</label>
          <select id="session-scoring" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;">
            <option value="Half-PPR" selected>Half-PPR (0.5 PPR)</option>
            <option value="Full-PPR">Full-PPR (1.0 PPR)</option>
            <option value="Standard">Standard (0.0 PPR)</option>
          </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
          <button type="button" id="btn-cancel-add" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Create Draft Room</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#close-add-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-add').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const urlInput = modal.querySelector('#session-league-url');
  const nameInput = modal.querySelector('#session-name');
  const platSelect = modal.querySelector('#session-platform');
  urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim();
    const yahooMatch = val.match(/\/f1\/(\d+)/) || val.match(/lid=(\d+)/) || (val.match(/^\d{5,8}$/) ? [null, val] : null);
    if (yahooMatch) {
      platSelect.value = 'yahoo';
      if (!nameInput.value || nameInput.value.startsWith('Yahoo')) {
        nameInput.value = `Yahoo: League ${yahooMatch[1]}`;
      }
    }
  });

  modal.querySelector('#form-add-session').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const platform = platSelect.value;
    const teamsCount = parseInt(document.getElementById('session-teams').value, 10);
    const userSlot = parseInt(document.getElementById('session-slot').value, 10);
    const scoring = document.getElementById('session-scoring').value;
    const rawUrl = urlInput.value.trim();
    const matchLid = rawUrl.match(/\/f1\/(\d+)/) || rawUrl.match(/lid=(\d+)/) || (rawUrl.match(/^\d{5,8}$/) ? [null, rawUrl] : null);
    const leagueId = matchLid ? matchLid[1] : null;
    const id = leagueId ? `${platform}-${leagueId}` : `${platform}-${Date.now().toString(36)}`;

    await store.createDraftSession({
      id,
      name,
      platform,
      leagueId,
      teamsCount,
      userSlot,
      scoring
    });
    closeModal();
  });
}

function openLeagueSettingsModal(session) {
  const existing = document.getElementById('modal-league-settings');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-league-settings';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 460px; width: 92%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="margin: 0; color: #fff; font-size: 1.15rem; font-weight: 800;">⚙️ League & Draft Settings</h3>
        <button id="close-settings-modal" style="background: transparent; border: none; color: var(--text-dim); font-size: 1.2rem; cursor: pointer;">✕</button>
      </div>
      <form id="form-edit-session" style="display: flex; flex-direction: column; gap: 0.9rem;">
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">YAHOO LEAGUE ID OR INVITE LINK</label>
          <input type="text" id="edit-session-league-url" value="${session?.leagueId || ''}" placeholder="e.g. 1548819 or paste Yahoo invite link" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;" />
          ${session?.leagueId ? `
            <div style="font-size: 0.76rem; color: #34d399; margin-top: 5px; display: flex; align-items: center; justify-content: space-between;">
              <span>✅ Linked to Yahoo League <strong>#${session.leagueId}</strong></span>
              <a href="https://football.fantasysports.yahoo.com/f1/${session.leagueId}/draftclient" target="_blank" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">Open Draft Room ↗</a>
            </div>
          ` : `
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">Enter your league ID (e.g. <code>1548819</code>) to link the Chrome extension.</div>
          `}
        </div>
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">LEAGUE NAME</label>
          <input type="text" id="edit-session-name" value="${session?.name || ''}" required style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;" />
        </div>
        <div style="display: flex; gap: 0.8rem;">
          <div style="flex: 1;">
            <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">TEAMS COUNT</label>
            <select id="edit-session-teams" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;">
              <option value="8" ${session?.teamsCount === 8 ? 'selected' : ''}>8 Teams</option>
              <option value="10" ${session?.teamsCount === 10 ? 'selected' : ''}>10 Teams</option>
              <option value="12" ${session?.teamsCount === 12 || !session?.teamsCount ? 'selected' : ''}>12 Teams</option>
              <option value="14" ${session?.teamsCount === 14 ? 'selected' : ''}>14 Teams</option>
              <option value="16" ${session?.teamsCount === 16 ? 'selected' : ''}>16 Teams</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">YOUR DRAFT SLOT</label>
            <input type="number" id="edit-session-slot" min="1" max="16" value="${session?.userSlot || 1}" required style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;" />
          </div>
        </div>
        <div>
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">SCORING FORMAT</label>
          <select id="edit-session-scoring" style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.85rem;">
            <option value="Half-PPR" ${session?.scoring === 'Half-PPR' ? 'selected' : ''}>Half-PPR (0.5 PPR)</option>
            <option value="Full-PPR" ${session?.scoring === 'Full-PPR' ? 'selected' : ''}>Full-PPR (1.0 PPR)</option>
            <option value="Standard" ${session?.scoring === 'Standard' ? 'selected' : ''}>Standard (0.0 PPR)</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
          <button type="button" id="btn-delete-session" class="btn-danger" style="font-size: 0.76rem; padding: 0.35rem 0.75rem;">🗑️ Delete League</button>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" id="btn-cancel-edit" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Save Changes</button>
          </div>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#close-settings-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-edit').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const urlInput = modal.querySelector('#edit-session-league-url');
  const nameInput = modal.querySelector('#edit-session-name');
  urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim();
    const match = val.match(/\/f1\/(\d+)/) || val.match(/lid=(\d+)/) || (val.match(/^\d{5,8}$/) ? [null, val] : null);
    if (match && nameInput.value.startsWith('Yahoo')) {
      nameInput.value = `Yahoo: League ${match[1]}`;
    }
  });

  modal.querySelector('#btn-delete-session').addEventListener('click', async () => {
    if (confirm(`Are you sure you want to delete "${session?.name}" and all its picks?`)) {
      await store.deleteDraftSession(session.id);
      closeModal();
    }
  });

  modal.querySelector('#form-edit-session').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawUrl = urlInput.value.trim();
    const matchLid = rawUrl.match(/\/f1\/(\d+)/) || rawUrl.match(/lid=(\d+)/) || (rawUrl.match(/^\d{5,8}$/) ? [null, rawUrl] : null);
    const leagueId = matchLid ? matchLid[1] : (rawUrl || session?.leagueId || null);

    const updated = {
      ...session,
      name: nameInput.value.trim(),
      leagueId: leagueId,
      teamsCount: parseInt(document.getElementById('edit-session-teams').value, 10),
      userSlot: parseInt(document.getElementById('edit-session-slot').value, 10),
      scoring: document.getElementById('edit-session-scoring').value
    };
    await store.createDraftSession(updated);
    closeModal();
  });
}

function openExtensionHelpModal(currentSession) {
  const existing = document.getElementById('modal-ext-help');
  if (existing) existing.remove();

  const state = store.getState();
  const linkedId = currentSession?.leagueId || (currentSession?.id?.includes('1548819') ? '1548819' : '1548819');
  const actualDraftRoomUrl = (linkedId === '1548819')
    ? 'https://football.fantasysports.yahoo.com/draftclient/f1/1548819/8?auth=4abeae969ecfd710'
    : (currentSession?.draftUrl || `https://football.fantasysports.yahoo.com/f1/${linkedId}`);
  const leagueHomeUrl = `https://football.fantasysports.yahoo.com/f1/${linkedId}`;

  const modal = document.createElement('div');
  modal.id = 'modal-ext-help';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 620px; width: 92%; max-height: 88vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.4rem;">🔌</span>
          <div>
            <h3 style="margin: 0; color: #fff; font-size: 1.15rem; font-weight: 800;">Real-Time Chrome Extension Bridge</h3>
            <div style="font-size: 0.74rem; color: #38bdf8;">Automatic pick syncing from Yahoo, ESPN & Sleeper drafts</div>
          </div>
        </div>
        <button id="close-ext-modal" style="background: transparent; border: none; color: var(--text-dim); font-size: 1.2rem; cursor: pointer;">✕</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.9rem; font-size: 0.82rem; color: var(--text-color); line-height: 1.5;">
        <!-- Live Connection Status Alert -->
        <div style="padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); background: ${state.bridgeConnected ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.1)'}; border: 1px solid ${state.bridgeConnected ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.3)'}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${state.bridgeConnected ? '#34d399' : '#fbbf24'}; box-shadow: 0 0 8px ${state.bridgeConnected ? '#34d399' : '#fbbf24'};"></span>
            <div>
              <strong style="color: #fff; font-size: 0.85rem;">Bridge Status: </strong>
              <span style="color: ${state.bridgeConnected ? '#34d399' : '#fbbf24'}; font-weight: 700;">
                ${state.bridgeConnected ? `CONNECTED (Yahoo League #${state.bridgeLeagueId || linkedId} • Slot #8)` : 'WAITING FOR YAHOO DRAFT TAB'}
              </span>
            </div>
          </div>
          <span style="font-size: 0.72rem; color: var(--text-dim);">Live Heartbeat: Every 2s</span>
        </div>

        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm); padding: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <strong style="color: #38bdf8; display: block; font-size: 0.85rem;">Target Draft Room:</strong>
              <div style="color: #fff; font-weight: 800; font-size: 1rem; margin-top: 2px;">${currentSession?.name || 'Yahoo: League 1'}</div>
              <div style="color: #34d399; font-size: 0.75rem; margin-top: 3px; font-weight: 700;">
                🟣 Yahoo League ID: <code>${linkedId}</code> • Slot #8
              </div>
            </div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <a href="${actualDraftRoomUrl}" target="_blank" class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #0284c7, #2563eb); border: 1px solid #38bdf8;">
                ⚡ Open Real Draft (Slot #8) ↗
              </a>
              <a href="${leagueHomeUrl}" target="_blank" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                League Home ↗
              </a>
            </div>
          </div>
        </div>

        <div style="font-weight: 700; color: #fff; margin-top: 0.1rem;">Setup in 3 simple steps:</div>
        
        <ol style="margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <li>Open <strong>Google Chrome</strong> and navigate to <code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #38bdf8;">chrome://extensions</code>.</li>
          <li>Turn ON <strong>"Developer mode"</strong> (toggle in top right corner), then click <strong>"Load unpacked"</strong>. <em>(If already loaded earlier, click the 🔄 reload icon on the card!)</em></li>
          <li>Select the <code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #34d399;">chrome-extension</code> folder from your project:
            <div style="margin-top: 4px; padding: 5px 8px; background: rgba(0,0,0,0.35); border-radius: 4px; font-family: monospace; font-size: 0.75rem; color: #fbbf24; word-break: break-all;">
              /Users/kumaran/Documents/FantasyFootball/chrome-extension
            </div>
          </li>
          <li>Click the <strong>"⚡ Open Real Draft (Slot #8) ↗"</strong> button above to open your live draft room in Chrome!</li>
        </ol>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); padding: 0.75rem;">
          <strong style="color: #34d399; display: block; margin-bottom: 0.25rem;">⚡ How Live Sync Works:</strong>
          Keep your Yahoo draft client open in one tab/window, and this Live Draft War Room open in another. Every time a pick is made in Yahoo, the bridge instantly crosses them off your board in real time!
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 0.25rem;">
          <button type="button" id="btn-done-ext" class="btn-primary" style="padding: 0.45rem 1rem;">Got It, Ready to Draft!</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#close-ext-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-done-ext').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}
