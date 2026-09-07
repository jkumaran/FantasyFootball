import { store } from '../store.js';
import { api } from '../api.js';
import { renderAuthModal } from './authModal.js';
import { getPlayerAnalytics } from '../data/analytics.js';

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

export function renderPreDraftView() {
  const container = document.getElementById('view-predraft');
  if (!container) return;

  const state = store.getState();
  const { players } = state;
  const isAuthed = Boolean(state.isAuthenticated);

  // Primary offensive positions: 4 columns side-by-side (RB, WR, TE, QB)
  const primaryPositions = ['RB', 'WR', 'TE', 'QB'];
  // Specialist positions rendered separately at the bottom (DST, K)
  const bottomPositions = ['DST', 'K'];
  const availableTiers = [1, 2, 3, 4, 5];

  // Filter and enriched data for Player Database & 6 Pillars Table
  const selectedPos = container.dataset.posFilter || 'ALL';
  const tableSearch = (container.dataset.tableSearchQuery || '').toLowerCase().trim();

  const enrichedPlayers = players.map((p, idx) => ({
    ...p,
    rank: p.ecr || p.customRank || (idx + 1),
    analytics: getPlayerAnalytics(p),
  }));

  const filteredPlayers = enrichedPlayers.filter(p => {
    if (selectedPos !== 'ALL' && p.pos !== selectedPos) return false;
    if (tableSearch) {
      const matchName = (p.name || '').toLowerCase().includes(tableSearch);
      const matchTeam = (p.team || '').toLowerCase().includes(tableSearch);
      const matchPos = (p.pos || '').toLowerCase().includes(tableSearch);
      if (!matchName && !matchTeam && !matchPos) return false;
    }
    return true;
  });

  const renderPosColumn = (pos) => {
    const posPlayers = players.filter(p => p.pos === pos);

    const posTiers = store.getTiersForPos(pos);
    const nextTier = (posTiers.length > 0 ? Math.max(...posTiers) : 0) + 1;

    // Group players by tier while maintaining exact array order
    const tiersMap = {};
    posTiers.forEach(t => { tiersMap[t] = []; });
    
    posPlayers.forEach(p => {
      const t = p.tier || 1;
      if (!tiersMap[t]) tiersMap[t] = [];
      tiersMap[t].push(p);
    });

    return `
      <div class="pos-column glass-card" data-pos="${pos}">
        <!-- Column Header -->
        <div class="pos-column-header">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="pos-badge pos-${pos.toLowerCase()}" style="font-size: 0.78rem; padding: 0.2rem 0.5rem;">${pos}</span>
            <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">${pos}</span>
          </div>
          <span class="tier-badge" style="font-size: 0.7rem;">${posPlayers.length}</span>
        </div>

        <!-- Quick Enter Player Name -->
        <div class="quick-add-box">
          <input type="text" class="search-input input-add-player" style="font-size: 0.75rem; padding: 0.3rem 0.5rem; width: 100%;" placeholder="+ Add ${pos}..." data-pos="${pos}">
          <button class="btn-primary btn-add-player" data-pos="${pos}" style="padding: 0.3rem 0.5rem; font-size: 0.72rem;">Add</button>
        </div>

        <!-- Tier Blocks Container with Adjustable Gaps -->
        <div class="tier-blocks-column" data-pos="${pos}">
          ${posTiers.map(tierNum => {
            const gap = store.getTierGap(pos, tierNum);
            const tierPlayers = tiersMap[tierNum] || [];

            return `
              <!-- Adjustable Vertical Gap Spacer -->
              <div class="tier-gap-spacer ${tierNum === 1 ? 'tier-top-spacer' : ''}" data-pos="${pos}" data-tier="${tierNum}" style="height: ${gap}px;" title="Drag up or down to adjust gap">
                <div class="gap-control-bar" title="Drag up or down to adjust gap">
                  <span class="gap-drag-handle">↕</span>
                  <span class="gap-label">${gap}px</span>
                </div>
              </div>

              <!-- Tier Block Card -->
              <div class="tier-box" data-pos="${pos}" data-tier="${tierNum}">
                <div class="tier-box-header" data-pos="${pos}" data-tier="${tierNum}" title="Drag up or down to adjust tier position">
                  <div style="display: flex; align-items: center; gap: 0.3rem;">
                    <span class="tier-drag-handle" title="Drag up/down">↕</span>
                    <span style="font-weight: 800; font-size: 0.76rem; color: var(--accent-primary);">TIER ${tierNum}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.35rem;">
                    <span class="tier-badge" style="font-size: 0.65rem;">${tierPlayers.length}</span>
                    <button class="btn-remove-tier" data-pos="${pos}" data-tier="${tierNum}" title="Remove Tier ${tierNum}" style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.75rem; padding: 0.1rem 0.25rem; border-radius: 3px; line-height: 1;">✕</button>
                  </div>
                </div>

                <!-- Player Cards Drop Zone -->
                <div class="player-drop-zone" data-pos="${pos}" data-tier="${tierNum}">
                  ${tierPlayers.length === 0 ? `
                    <div class="empty-tier-msg">Drop player here</div>
                  ` : ''}

                  ${tierPlayers.map((p, idx) => {
                    const isDrafted = store.isPlayerDrafted(p.id);
                    const overallRank = p.ecr || p.customRank || (idx + 1);
                    return `
                      <div class="draggable-player-card ${isDrafted ? 'card-drafted' : ''}" draggable="true" data-id="${p.id}" data-pos="${pos}" data-tier="${tierNum}" data-index="${idx}">
                        <div class="player-card-left">
                          <input type="checkbox" class="player-draft-chk" data-id="${p.id}" ${isDrafted ? 'checked' : ''} title="${isDrafted ? 'Drafted (click to unmark)' : 'Mark Drafted'}">
                          <div class="player-info" style="min-width: 0; overflow: hidden;">
                            <span class="player-drag-dots" title="Drag to reorder">⋮⋮</span>
                            <div style="min-width: 0; overflow: hidden;">
                              <div class="player-name ${isDrafted ? 'name-drafted' : ''}" title="${p.name}">
                                ${p.name}
                                ${isDrafted ? '<span class="drafted-badge">DRAFTED</span>' : ''}
                              </div>
                              <div class="player-team">${p.team} • Bye ${p.bye}</div>
                            </div>
                          </div>
                        </div>

                        <span style="font-size: 0.65rem; font-weight: 700; color: ${isDrafted ? '#64748b' : '#34d399'}; flex-shrink: 0;" title="Overall Rank #${overallRank}"><span style="opacity:0.6;">#</span>${overallRank}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Option to Add Tier at Bottom of Column -->
        <div class="column-footer" style="margin-top: 0.4rem; padding-top: 0.25rem;">
          <button class="btn-add-tier" data-pos="${pos}" title="Add Tier ${nextTier} at the bottom of ${pos}">
            + Add Tier ${nextTier}
          </button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <!-- Sticky Action Bar (Always Visible) -->
      <div class="glass-card sticky-tier-toolbar">
        <!-- Group 1: Load, Load J/K, Load SL, Import (Thin Dotted Rectangle) -->
        <div style="border: 1px dotted rgba(255, 255, 255, 0.4); border-radius: 6px; padding: 0.2rem 0.35rem; display: inline-flex; align-items: center; gap: 0.35rem;">
          <button class="btn-secondary" id="btn-load-board" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #cbd5e1;" title="Load active tier_board.yaml from server">
            📂 Load
          </button>
          <button class="btn-secondary" id="btn-load-jody-koerner" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" title="Load Jody Smith & Sean Koerner consensus expert rankings">
            📊 Load J/K
          </button>
          <button class="btn-secondary" id="btn-load-sharplineup" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #34d399; border-color: rgba(52, 211, 153, 0.4);" title="Load SharpLineup Market Implied Top 300 rankings">
            🏈 Load SL
          </button>
          <input type="file" id="file-import-yaml" accept=".yaml,.yml,.txt" style="display: none;">
          <button class="btn-secondary" id="btn-import-board" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer;" title="Load tier board from a local YAML file">
            📥 Import
          </button>
        </div>

        <!-- Group 2: Autosave, Save, Export -->
        <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 0.2rem 0.35rem;">
          <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: #cbd5e1; cursor: pointer; padding: 0.38rem 0.6rem; background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); border-radius: 6px; user-select: none;" title="Toggle automatic saving to server YAML file">
            <input type="checkbox" id="chk-autosave" ${store.isAutosave() ? 'checked' : ''} style="cursor: pointer; accent-color: var(--accent-primary);">
            <span>Autosave</span>
          </label>
          <button class="${store.getHasUnsavedChanges() ? 'btn-primary' : 'btn-secondary'}" id="btn-save-board-yaml" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; ${store.getHasUnsavedChanges() ? 'background: #f59e0b; border-color: #d97706; color: #000; font-weight: 700;' : ''}" title="${store.getHasUnsavedChanges() ? 'You have unsaved changes! Click to save to in-use tier_board.yaml' : 'All changes saved to in-use YAML'}">
            💾 Save ${store.getHasUnsavedChanges() ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; margin-left:2px;"></span>' : ''}
          </button>
          <button class="btn-secondary" id="btn-export-board" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer;" title="Export board with visual tier alignment to a local YAML file">
            📤 Export
          </button>
        </div>

        <!-- Group 3: Positional Links (Offense first, then DST & K, then Player DB) -->
        <div style="display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 0.2rem 0.35rem; margin-left: auto;">
          <button class="btn-secondary" id="btn-jump-top-bar" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #facc15; border-color: rgba(250, 204, 21, 0.4);" title="Jump to top / Offense tiers">
            🏈 Offense
          </button>
          <button class="btn-secondary" id="btn-jump-dst-k" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer;" title="Jump down to DST & K tiers">
            🛡️ DST & K ↓
          </button>
          <button class="btn-secondary" id="btn-jump-player-db" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #a78bfa; border-color: rgba(167, 139, 250, 0.4);" title="Jump down to Player Database & Evaluation Framework">
            📋 Player DB ↓
          </button>
        </div>
      </div>

      <!-- Primary 4-Column Offense Board (RB, WR, TE, QB) -->
      <div class="position-columns-grid">
        ${primaryPositions.map(renderPosColumn).join('')}
      </div>

      <!-- Specialists & Late-Round Companion Split Container (Half-Page Width) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.25rem; align-items: stretch;">
        <!-- Left Half: Defense & Kicker Tiers (DST & K) -->
        <div id="section-dst-k" class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
              <span>🛡️ Defense & Kicker Tiers (DST & K)</span>
            </h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
              Specialist positions kept separate for late-round drafting. Full tier dragging, gap adjustments, and drafting features enabled.
            </p>
          </div>
          <div class="specialists-grid">
            ${bottomPositions.map(renderPosColumn).join('')}
          </div>
        </div>

        <!-- Right Half: Late-Round Specialists & Streaming Playbook -->
        <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(99, 102, 241, 0.25);">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 800; color: #e0e7ff; display: flex; align-items: center; gap: 0.5rem;">
              <span>⚡ Late-Round Specialists & Streaming Playbook</span>
            </h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
              High-yield tactical cheat sheet for final draft rounds and early-season waiver wire streaming.
            </p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.65rem; flex: 1; justify-content: space-between;">
            <!-- DST Streaming Blueprint -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                <span style="font-size: 0.82rem;">🛡️</span>
                <strong style="font-size: 0.8rem; color: #38bdf8;">DST Streaming Formula & Early Targets</strong>
              </div>
              <p style="margin: 0; font-size: 0.73rem; color: #cbd5e1; line-height: 1.35;">
                Target defenses favored at home with opponent implied total <strong>&lt; 20.0 pts</strong> facing turnover-prone QBs or bottom-10 O-lines. Top Weeks 1–2 targets:
              </p>
              <div style="margin-top: 0.35rem; display: flex; gap: 0.35rem; flex-wrap: wrap;">
                <span style="font-size: 0.68rem; padding: 0.12rem 0.4rem; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; color: #38bdf8;">NO: W1 vs CAR, W2 at DAL</span>
                <span style="font-size: 0.68rem; padding: 0.12rem 0.4rem; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; color: #38bdf8;">CIN: W1 vs NE, W2 at KC</span>
                <span style="font-size: 0.68rem; padding: 0.12rem 0.4rem; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; color: #38bdf8;">SEA: W1 vs DEN, W2 at NE</span>
              </div>
            </div>

            <!-- Kicker Selection Criteria -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                <span style="font-size: 0.82rem;">🎯</span>
                <strong style="font-size: 0.8rem; color: #34d399;">Kicker Selection Rules</strong>
              </div>
              <p style="margin: 0; font-size: 0.73rem; color: #cbd5e1; line-height: 1.35;">
                Target kickers on top-10 scoring offenses (<strong>implied PPG &gt; 24.0</strong>) in domes or calm weather (wind &lt; 15 mph). Teams with efficient 20-to-20 yard offenses that stall in the red zone yield the highest volume of 40+ yard FG attempts.
              </p>
            </div>

            <!-- Late-Round RB/WR Stashes -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                <span style="font-size: 0.82rem;">⚡</span>
                <strong style="font-size: 0.8rem; color: #facc15;">Late-Round High-Upside Stashes</strong>
              </div>
              <p style="margin: 0; font-size: 0.73rem; color: #cbd5e1; line-height: 1.35;">
                Draft backup RBs with direct contingent monopolization (inheriting 75%+ touches if the starter is sidelined) over low-ceiling committee plodders. For WRs, target explosive rookie wideouts whose target shares accelerate post-bye.
              </p>
            </div>

            <!-- Critical Bye Week Clusters -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                <span style="font-size: 0.82rem;">📅</span>
                <strong style="font-size: 0.8rem; color: #c084fc;">Roster Construction: Bye Week Clusters</strong>
              </div>
              <p style="margin: 0; font-size: 0.73rem; color: #cbd5e1; line-height: 1.35;">
                Avoid stacking too many starters in heavy bye clusters: <strong>Week 6</strong> (KC, MIA, MIN, LAR), <strong>Week 7</strong> (CHI, DAL), <strong>Week 9</strong> (SF, PIT), <strong>Week 12</strong> (BUF, CIN, ATL), and <strong>Week 14</strong> (BAL, DEN, HOU, IND, NE, WAS).
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Player Database & Rankings Section with Strategy Framework -->
      <div class="glass-card" id="section-player-db" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem;">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 1.15rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
            📊 Player Database & Rankings
          </span>
          <span class="tier-badge" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">${players.length} Players Tracked</span>
        </div>

        <!-- Evaluation Framework Guidance Cards -->
        <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-md); padding: 1.1rem; display: flex; flex-direction: column; gap: 0.9rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.1rem;">🧠</span>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #e0e7ff;">Advanced Draft Strategy & Player Evaluation Framework</h4>
          </div>
          <p style="margin: 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.45;">
            Integrate these core analytical pillars to identify draft value, breakout candidates, regression risks, and tier leverage:
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.85rem; margin-top: 0.25rem;">
            <!-- Pillar 1 -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem;">🎯</span>
                <strong style="font-size: 0.82rem; color: #38bdf8;">Volume & Opportunity Share</strong>
              </div>
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                Volume is the strongest predictor of fantasy success. For running backs, evaluate <strong>Opportunity Share</strong> (carries + targets) and high-value touches (red-zone carries & goal-line work). For receivers, focus on <strong>Target Share</strong> (<em>20%+</em> is solid, <em>25%+</em> is elite) and <strong>Air Yards / WOPR</strong> (Weighted Opportunity Rating) revealing true downfield intent regardless of completion rate.
              </p>
            </div>

            <!-- Pillar 2 -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem;">⚡</span>
                <strong style="font-size: 0.82rem; color: #34d399;">Per-Game Efficiency Over Total Points</strong>
              </div>
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                Total points from previous seasons penalize players who missed time with fluky injuries. Always examine <strong>Fantasy Points Per Game (PPG)</strong> and <strong>Targets / Carries Per Route Run (TPRR/CPRR)</strong> to measure true efficiency and per-snap dominance when on the field.
              </p>
            </div>

            <!-- Pillar 3 -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem;">🏟️</span>
                <strong style="font-size: 0.82rem; color: #facc15;">Offensive Environment & Game Script</strong>
              </div>
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                Rather than simply looking at raw offensive vs defensive strength, examine <strong>Projected Team Implied Point Totals</strong> (via Vegas win totals / over-unders) and <strong>Neutral-Situation Pass/Run Rates</strong>. High-scoring offenses generate significantly more red-zone drives, boosting touchdown upside across all skill positions.
              </p>
            </div>

            <!-- Pillar 4 -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem;">🛡️</span>
                <strong style="font-size: 0.82rem; color: #fb7185;">Offensive Line Rankings</strong>
              </div>
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                A weak offensive line degrades pocket time for QBs, delays deep-developing routes for WRs, and crushes RB yards before contact. Look at <strong>run-block and pass-block win rates</strong> or unit composite grades when drafting skill position players.
              </p>
            </div>

            <!-- Pillar 5 -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem;">📋</span>
                <strong style="font-size: 0.82rem; color: #c084fc;">Coaching & Play-Calling Trends</strong>
              </div>
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                Coaching changes drive massive shifts in <strong>pace of play</strong> (total plays per game) and offensive scheme (e.g., heavy 2-TE sets vs 3-WR spread, or zone-read rushing vs power-gap blocking). Target coaches who rank top-10 in neutral offensive tempo.
              </p>
            </div>

            <!-- Pillar 6 -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span style="font-size: 0.85rem;">📅</span>
                <strong style="font-size: 0.82rem; color: #a3e635;">Strength of Schedule (SoS)</strong>
              </div>
              <p style="margin: 0; font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                Useful primarily as a tiebreaker between adjacent tier picks. Note that pre-season SoS has a high rate of decay as defenses fluctuate drastically year-to-year. <strong>Late-season / playoff SoS (Weeks 15–17)</strong> is most actionable for deep benches or trading targets mid-season rather than early-round draft picks.
              </p>
            </div>
          </div>
        </div>

        <!-- Interactive Position Filter and Table Search -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem;">
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
            <button class="pos-filter-btn" data-pos="ALL" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 20px; cursor: pointer; background: ${selectedPos === 'ALL' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}; color: ${selectedPos === 'ALL' ? '#000' : '#cbd5e1'}; font-weight: 700; border: 1px solid var(--border-color);">
              All (${players.length})
            </button>
            ${['RB', 'WR', 'TE', 'QB'].map(pos => `
              <button class="pos-filter-btn" data-pos="${pos}" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 20px; cursor: pointer; background: ${selectedPos === pos ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}; color: ${selectedPos === pos ? '#000' : '#cbd5e1'}; font-weight: 700; border: 1px solid var(--border-color);">
                ${pos} (${players.filter(p => p.pos === pos).length})
              </button>
            `).join('')}
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="text" id="table-player-search" value="${container.dataset.tableSearchQuery || ''}" placeholder="🔍 Search player, team, pos..." style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: #fff; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.78rem; outline: none; width: 200px;">
          </div>
        </div>

        <!-- Stat Table with 6 Analytical Pillars -->
        <div class="stat-table-wrapper">
          <table class="stat-table">
            <thead>
              <tr>
                <th title="Overall Consensus Rank">Rank</th>
                <th title="Player Name">Player</th>
                <th title="Position">Pos</th>
                <th title="NFL Team & Bye Week">Team</th>
                <th title="Tier">Tier</th>
                <th title="Consensus ECR">ECR</th>
                <th title="Pillar 2 (Efficiency): Projected Points Per Game & Season Total">Proj PPG (Tot)</th>
                <th title="Pillar 2 (Efficiency): YPRR for WR/TE, Explosive Run % for RB, YPA for QB">Per-Play Eff</th>
                <th title="Pillar 1 (Volume & Opportunity): Opportunity Share % for RB / WOPR for WR/TE">Opp / WOPR</th>
                <th title="Pillar 1 (Volume & Opportunity): Target Share %">Tgt %</th>
                <th title="Pillar 1 (Volume & Opportunity): Red Zone Touches">RZ Tch</th>
                <th title="Pillar 3 (Environment): Vegas Implied Team PPG & Neutral Pass %">Env (Vegas / Pass%)</th>
                <th title="Pillar 4 (Offensive Line): Unit Rank (1-32) & Tier Grade">OL Rank</th>
                <th title="Pillar 5 (Coaching & Pace): Neutral Seconds/Snap Rank & Offensive Scheme">Pace & Scheme</th>
                <th title="Pillar 6 (Strength of Schedule): Fantasy Playoff Schedule (Weeks 15-17)">Playoff SoS</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPlayers.map((p) => {
                const a = p.analytics;
                let olColor = '#34d399';
                if (a.olRank > 28) olColor = '#f87171';
                else if (a.olRank > 21) olColor = '#fb923c';
                else if (a.olRank > 12) olColor = '#facc15';

                let sosColor = '#38bdf8';
                if (a.playoffSos.startsWith('A')) sosColor = '#34d399';
                else if (a.playoffSos.startsWith('C')) sosColor = '#fb923c';
                else if (a.playoffSos.startsWith('D')) sosColor = '#f87171';

                return `
                  <tr>
                    <td style="font-weight: 700; color: var(--accent-primary);">${p.rank}</td>
                    <td style="font-weight: 700; color: #fff;">${p.name}</td>
                    <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                    <td style="color: #cbd5e1;">${p.team} <span style="font-size: 0.68rem; color: var(--text-dim);">b${p.bye || '-'}</span></td>
                    <td><span class="tier-badge">T${p.tier}</span></td>
                    <td style="color: var(--text-muted);">${p.ecr || '-'}</td>
                    <td style="font-weight: 700; color: #34d399;">
                      ${a.projPpg} <span style="font-size: 0.7rem; font-weight: 500; color: var(--text-dim);">(${p.projectedPts})</span>
                    </td>
                    <td style="font-weight: 600; color: #38bdf8;">${a.effLabel}</td>
                    <td style="font-weight: 600; color: #facc15;">${a.oppShareLabel}</td>
                    <td>${a.targetShare ? a.targetShare + '%' : '-'}</td>
                    <td>${a.rzTouches || 0}</td>
                    <td style="font-size: 0.78rem;">
                      <strong style="color: #38bdf8;">${a.impliedPpg}</strong> <span style="color: var(--text-dim);">(${a.neutralPassRate}%)</span>
                    </td>
                    <td>
                      <span style="font-weight: 700; color: ${olColor};">#${a.olRank}</span>
                      <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 2px;">${a.olGrade}</span>
                    </td>
                    <td style="font-size: 0.74rem; color: #cbd5e1;" title="${a.scheme}">
                      <span style="color: #c084fc; font-weight: 600;">${a.paceLabel}</span>
                      <span style="color: var(--text-dim); margin-left: 3px;">· ${a.scheme.split('/')[0].trim()}</span>
                    </td>
                    <td>
                      <span style="font-weight: 600; color: ${sosColor};">${a.playoffSos}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // --- ATTACH EVENT LISTENERS ---

  // Jump to DST & K
  const btnJumpDstK = container.querySelector('#btn-jump-dst-k');
  if (btnJumpDstK) {
    btnJumpDstK.addEventListener('click', () => {
      const target = document.getElementById('section-dst-k');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Jump to Player Database
  const btnJumpPlayerDb = container.querySelector('#btn-jump-player-db');
  if (btnJumpPlayerDb) {
    btnJumpPlayerDb.addEventListener('click', () => {
      const target = document.getElementById('section-player-db');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Jump Back to Offense (Top of Page)
  const btnJumpTopBar = container.querySelector('#btn-jump-top-bar');
  if (btnJumpTopBar) {
    btnJumpTopBar.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Position Filter Pills for Table
  const posFilterBtns = container.querySelectorAll('.pos-filter-btn');
  posFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.dataset.posFilter = e.currentTarget.dataset.pos;
      renderPreDraftView();
    });
  });

  // Table Player Search Input
  const tableSearchInput = container.querySelector('#table-player-search');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      container.dataset.tableSearchQuery = e.target.value;
      renderPreDraftView();
      const updatedInput = container.querySelector('#table-player-search');
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.selectionStart = updatedInput.selectionEnd = updatedInput.value.length;
      }
    });
  }

  // Load SharpLineup Button
  const btnLoadSL = container.querySelector('#btn-load-sharplineup');
  if (btnLoadSL) {
    btnLoadSL.addEventListener('click', async () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      btnLoadSL.disabled = true;
      btnLoadSL.innerHTML = '⏳ Loading...';
      const ok = await store.loadPreset('sharplineup');
      if (ok) {
        btnLoadSL.innerHTML = '✅ Loaded!';
        setTimeout(() => {
          renderPreDraftView();
        }, 800);
      } else {
        btnLoadSL.innerHTML = '❌ Failed';
        setTimeout(() => {
          renderPreDraftView();
        }, 1200);
      }
    });
  }

  // Load Jody/Koerner Button
  const btnLoadJK = container.querySelector('#btn-load-jody-koerner');
  if (btnLoadJK) {
    btnLoadJK.addEventListener('click', async () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      btnLoadJK.disabled = true;
      btnLoadJK.innerHTML = '⏳ Loading...';
      const ok = await store.loadPreset('jody_koerner');
      if (ok) {
        btnLoadJK.innerHTML = '✅ Loaded!';
        setTimeout(() => {
          renderPreDraftView();
        }, 800);
      } else {
        btnLoadJK.innerHTML = '❌ Failed';
        setTimeout(() => {
          renderPreDraftView();
        }, 1200);
      }
    });
  }

  // Load Current Button (Loads server in-use tier_board.yaml)
  const btnLoadBoard = container.querySelector('#btn-load-board');
  if (btnLoadBoard) {
    btnLoadBoard.addEventListener('click', async () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      btnLoadBoard.disabled = true;
      btnLoadBoard.innerHTML = '⏳ Loading...';
      const ok = await store.loadSavedBoard();
      if (ok) {
        btnLoadBoard.innerHTML = '✅ Loaded!';
        setTimeout(() => {
          renderPreDraftView();
        }, 800);
      } else {
        btnLoadBoard.innerHTML = '❌ Failed';
        setTimeout(() => {
          renderPreDraftView();
        }, 1200);
      }
    });
  }

  // Autosave Checkbox
  const chkAutosave = container.querySelector('#chk-autosave');
  if (chkAutosave) {
    chkAutosave.addEventListener('change', async (e) => {
      if (!store.getState().isAuthenticated) {
        e.preventDefault();
        e.target.checked = !e.target.checked;
        renderAuthModal();
        return;
      }
      store.setAutosave(e.target.checked);
    });
  }

  // Save Board to Server YAML Button
  const btnSaveBoard = container.querySelector('#btn-save-board-yaml');
  if (btnSaveBoard) {
    btnSaveBoard.addEventListener('click', async () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      btnSaveBoard.disabled = true;
      btnSaveBoard.innerHTML = '⏳ Saving...';
      const ok = await store.saveBoardToServer();
      if (ok) {
        btnSaveBoard.innerHTML = '✅ Saved!';
        setTimeout(() => {
          renderPreDraftView();
        }, 1000);
      } else {
        btnSaveBoard.innerHTML = '❌ Save Failed';
        setTimeout(() => {
          renderPreDraftView();
        }, 1500);
      }
    });
  }

  // Import / Load YAML Button
  const btnImport = container.querySelector('#btn-import-board');
  const fileInput = container.querySelector('#file-import-yaml');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const yamlText = event.target.result;
        const success = store.loadFromYaml(yamlText, false, true);
        if (success) {
          if (store.isAutosave()) {
            await api.saveBoardYaml(yamlText);
          }
          alert(`✅ Successfully loaded tier board from "${file.name}"! Click "Save Board" or toggle Autosave to persist to server.`);
          renderPreDraftView();
        } else {
          alert('⚠️ Could not parse the selected YAML file. Please make sure it is a valid tier board file.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Export Board (YAML) Button
  const btnExport = container.querySelector('#btn-export-board');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const yamlContent = store.exportYaml();
      const dateStr = new Date().toISOString().split('T')[0];
      downloadFile(yamlContent, `fantasy_tier_board_${dateStr}.yaml`, 'text/yaml;charset=utf-8;');
    });
  }



  // Quick Add Player
  const handleAddPlayer = (pos, inputEl) => {
    if (!store.getState().isAuthenticated) {
      renderAuthModal();
      return;
    }
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
    chk.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!store.getState().isAuthenticated) {
        e.preventDefault();
        renderAuthModal();
        return;
      }
    });
    chk.addEventListener('change', async (e) => {
      e.stopPropagation();
      if (!store.getState().isAuthenticated) {
        e.preventDefault();
        e.target.checked = !e.target.checked;
        renderAuthModal();
        return;
      }
      const playerId = e.target.dataset.id;
      await store.togglePlayerDrafted(playerId);
      renderPreDraftView();
    });
  });

  // --- ADD TIER AT BOTTOM OF COLUMN ---
  container.querySelectorAll('.btn-add-tier').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      const pos = btn.dataset.pos;
      if (!pos) return;
      store.addTier(pos);
      renderPreDraftView();
    });
  });

  // --- DELETE TIER ---
  container.querySelectorAll('.btn-remove-tier').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      const pos = btn.dataset.pos;
      const tierNum = parseInt(btn.dataset.tier, 10);
      if (pos && !isNaN(tierNum)) {
        store.deleteTier(pos, tierNum);
        renderPreDraftView();
      }
    });
  });

  // --- DRAG TIERS UP / DOWN (CONSTRAINED BY TOP/PREV TIER & NEXT TIER, UNBOUNDED AT BOTTOM) ---
  container.querySelectorAll('.tier-gap-spacer, .tier-box-header, .gap-control-bar').forEach(handle => {
    handle.addEventListener('pointerdown', (e) => {
      // Ignore clicks on player cards, checkboxes, buttons, or inputs
      if (e.target.closest('.draggable-player-card, input, button, .player-draft-chk')) return;

      if (!store.getState().isAuthenticated) {
        e.preventDefault();
        renderAuthModal();
        return;
      }

      const targetEl = handle.closest('.tier-gap-spacer, .tier-box');
      if (!targetEl) return;
      const pos = targetEl.dataset.pos;
      const tierNum = parseInt(targetEl.dataset.tier, 10);
      if (!pos || isNaN(tierNum)) return;

      e.preventDefault();

      const allTiers = store.getTiersForPos(pos);
      const idx = allTiers.indexOf(tierNum);
      if (idx === -1) return;

      const nextTier = idx < allTiers.length - 1 ? allTiers[idx + 1] : null;
      const initialGap = store.getTierGap(pos, tierNum);
      const initialNextGap = nextTier ? store.getTierGap(pos, nextTier) : null;
      const startY = e.clientY;

      const colEl = container.querySelector(`.tier-blocks-column[data-pos="${pos}"]`);
      const curSpacer = colEl?.querySelector(`.tier-gap-spacer[data-tier="${tierNum}"]`);
      const nextSpacer = nextTier ? colEl?.querySelector(`.tier-gap-spacer[data-tier="${nextTier}"]`) : null;
      const curTierBox = colEl?.querySelector(`.tier-box[data-tier="${tierNum}"]`);

      if (curTierBox) curTierBox.classList.add('tier-dragging');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      let finalGap = initialGap;
      let finalNextGap = initialNextGap;

      const onPointerMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;

        // Upper limit (moving UP):
        // Cannot reduce gap(t) below 0 (limited by top or previous tier)
        const minDelta = -initialGap;

        // Lower limit (moving DOWN):
        // If nextTier exists: cannot reduce gap(nextTier) below 0 (limited by next tier)
        // If nextTier does not exist (bottom tier): unlimited downward!
        const maxDelta = nextTier ? initialNextGap : Infinity;

        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaY));

        finalGap = Math.max(0, Math.round(initialGap + clampedDelta));

        if (curSpacer) {
          curSpacer.style.height = `${finalGap}px`;
          const label = curSpacer.querySelector('.gap-label');
          if (label) label.textContent = `${finalGap}px`;
        }

        if (nextTier && nextSpacer) {
          finalNextGap = Math.max(0, Math.round(initialNextGap - clampedDelta));
          nextSpacer.style.height = `${finalNextGap}px`;
          const nextLabel = nextSpacer.querySelector('.gap-label');
          if (nextLabel) nextLabel.textContent = `${finalNextGap}px`;
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (curTierBox) curTierBox.classList.remove('tier-dragging');

        if (nextTier && finalNextGap !== null) {
          store.setTierGaps(pos, { [tierNum]: finalGap, [nextTier]: finalNextGap });
        } else {
          store.setTierGap(pos, tierNum, finalGap);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
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
      if (!store.getState().isAuthenticated) {
        e.preventDefault();
        renderAuthModal();
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

window.refreshPreDraftView = renderPreDraftView;
