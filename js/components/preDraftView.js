import { store } from '../store.js';
import { api } from '../api.js';
import { renderAuthModal } from './authModal.js';
import { openSharpLineupModal } from './sharpLineupModal.js';

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

  let searchQuery = container.dataset.searchQuery || '';

  const renderPosColumn = (pos) => {
    const posPlayers = players.filter(p => {
      const matchesPos = p.pos === pos;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.team.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPos && matchesSearch;
    });

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

                        <span style="font-size: 0.65rem; font-weight: 700; color: ${isDrafted ? '#64748b' : '#34d399'}; flex-shrink: 0;"><span style="opacity:0.6;">#</span>${idx + 1}</span>
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
      <!-- Control Bar -->
      <div class="glass-card" style="padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff;">🏆 Positional Tier Board</h2>
            <p style="font-size: 0.8rem; color: var(--text-muted);">
              Check boxes to mark players drafted. Drag players to reorder within a tier. Adjust vertical gaps using <strong>↕ Gap Handles</strong>. Click <strong>💾 Save Board</strong> or toggle <strong>Autosave</strong> to persist your board to server YAML.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <input type="text" class="search-input" id="board-search" placeholder="🔍 Search player..." value="${searchQuery}">
            
            <button class="btn-secondary" id="btn-load-sharplineup" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #34d399; border-color: rgba(52, 211, 153, 0.4);" title="Load SharpLineup Market Implied Top 300 rankings">
              🏈 Load SharpLineup
            </button>

            <button class="btn-secondary" id="btn-load-jody-koerner" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" title="Load Jody Smith & Sean Koerner consensus expert rankings">
              📊 Load Jody/Koerner
            </button>

            <button class="btn-secondary" id="btn-view-rankings" style="padding: 0.45rem 0.8rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #cbd5e1;" title="View and compare SharpLineup and Jody/Koerner rankings without modifying board">
              👁️ View Rankings
            </button>

            <button class="${store.getHasUnsavedChanges() ? 'btn-primary' : 'btn-secondary'}" id="btn-save-board-yaml" style="padding: 0.45rem 0.85rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.35rem; cursor: pointer; ${store.getHasUnsavedChanges() ? 'background: #f59e0b; border-color: #d97706; color: #000; font-weight: 700;' : ''}" title="${store.getHasUnsavedChanges() ? 'You have unsaved changes! Click to save to in-use tier_board.yaml' : 'All changes saved to in-use YAML'}">
              💾 Save Board ${store.getHasUnsavedChanges() ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; margin-left:2px;"></span>' : ''}
            </button>

            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #cbd5e1; cursor: pointer; padding: 0.4rem 0.6rem; background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); border-radius: 6px; user-select: none;" title="Toggle automatic saving to server YAML file">
              <input type="checkbox" id="chk-autosave" ${store.isAutosave() ? 'checked' : ''} style="cursor: pointer; accent-color: var(--accent-primary);">
              <span>Autosave</span>
            </label>

            <button class="btn-secondary" id="btn-jump-dst-k" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem; cursor: pointer;" title="Jump down to DST & K tiers">
              🛡️ DST & K ↓
            </button>
            <input type="file" id="file-import-yaml" accept=".yaml,.yml,.txt" style="display: none;">
            <button class="btn-secondary" id="btn-import-board" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem; cursor: pointer;" title="Load tier board from a local YAML file">
              📂 Load YAML
            </button>
            <button class="btn-secondary" id="btn-clean-empty-tiers" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem; cursor: pointer;" title="Remove all tiers with no players">
              🗑️ Remove Empty
            </button>
            <button class="btn-secondary" id="btn-export-board" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem; cursor: pointer;" title="Export board with visual tier alignment to a local YAML file">
              📥 Export YAML
            </button>
          </div>
        </div>
      </div>

      <!-- Primary 4-Column Offense Board (RB, WR, TE, QB) -->
      <div class="position-columns-grid">
        ${primaryPositions.map(renderPosColumn).join('')}
      </div>

      <!-- Dedicated Specialists Section at Bottom (DST & K) -->
      <div id="section-dst-k" class="glass-card" style="padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
              <span>🛡️ Defense & Kicker Tiers (DST & K)</span>
            </h3>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
              Specialist positions kept separate for late-round drafting. Full tier dragging, gap adjustments, and drafting features enabled.
            </p>
          </div>
          <button id="btn-jump-top" class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; cursor: pointer;">
            ↑ Back to Top Board
          </button>
        </div>
        <div class="specialists-grid">
          ${bottomPositions.map(renderPosColumn).join('')}
        </div>
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

  // Jump to DST & K and Back to Top
  const btnJumpDstK = container.querySelector('#btn-jump-dst-k');
  if (btnJumpDstK) {
    btnJumpDstK.addEventListener('click', () => {
      const target = document.getElementById('section-dst-k');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnJumpTop = container.querySelector('#btn-jump-top');
  if (btnJumpTop) {
    btnJumpTop.addEventListener('click', () => {
      container.scrollIntoView({ behavior: 'smooth' });
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
      const confirmed = confirm(
        'Load SharpLineup Top 300 rankings into your tier board?\n\nThis will update your board with the SharpLineup market-implied dataset.'
      );
      if (!confirmed) return;

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
      const confirmed = confirm(
        'Load Jody Smith & Sean Koerner consensus rankings into your tier board?\n\nThis will update your board with the Jody/Koerner tier dataset.'
      );
      if (!confirmed) return;

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

  // View Rankings Modal
  const btnViewRankings = container.querySelector('#btn-view-rankings');
  if (btnViewRankings) {
    btnViewRankings.addEventListener('click', () => {
      openSharpLineupModal('sharplineup');
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

  // Remove Empty Tiers Button
  const btnCleanEmpty = container.querySelector('#btn-clean-empty-tiers');
  if (btnCleanEmpty) {
    btnCleanEmpty.addEventListener('click', () => {
      if (!store.getState().isAuthenticated) {
        renderAuthModal();
        return;
      }
      store.removeEmptyTiers();
      renderPreDraftView();
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
