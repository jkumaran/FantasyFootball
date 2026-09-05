import { api } from '../api.js';
import { parseBoardYaml, store } from '../store.js';

const cachedPresets = {
  sharplineup: null,
  jody_koerner: null
};

export async function openSharpLineupModal(defaultPreset = 'sharplineup') {
  return openRankingsModal(defaultPreset);
}

export async function openRankingsModal(initialPreset = 'sharplineup') {
  let modalEl = document.getElementById('sharplineup-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'sharplineup-modal';
    document.body.appendChild(modalEl);
  }

  let currentPreset = (initialPreset === 'jody_koerner' || initialPreset === 'jody') ? 'jody_koerner' : 'sharplineup';
  let activeTab = 'table'; // 'table' | 'tiers' | 'yaml'
  let filterPos = 'ALL';
  let searchQuery = '';

  async function loadPresetData(presetKey) {
    if (cachedPresets[presetKey]) return cachedPresets[presetKey];

    modalEl.innerHTML = `
      <div class="auth-modal-overlay" style="z-index: 10000; display: flex; align-items: center; justify-content: center;">
        <div class="glass-card" style="padding: 2rem; max-width: 500px; text-align: center;">
          <p style="color: #fff; font-size: 1rem;">⏳ Loading ${presetKey === 'jody_koerner' ? 'Jody / Koerner' : 'SharpLineup'} Rankings...</p>
        </div>
      </div>
    `;

    let res = null;
    if (presetKey === 'jody_koerner') {
      res = await api.getJodyKoernerYaml();
    } else {
      res = await api.getSharpLineupYaml();
    }

    if (res && res.success && res.yaml) {
      cachedPresets[presetKey] = {
        yaml: res.yaml,
        parsed: parseBoardYaml(res.yaml)
      };
      return cachedPresets[presetKey];
    }
    return null;
  }

  const renderModalContent = async () => {
    const data = await loadPresetData(currentPreset);
    if (!data || !data.parsed) {
      alert(`Could not load ${currentPreset} rankings data.`);
      modalEl.remove();
      return;
    }

    const { parsed, yaml } = data;
    const players = parsed.players || [];
    const positions = ['RB', 'WR', 'TE', 'QB', 'DST', 'K'];

    const filteredPlayers = players.filter(p => {
      const matchPos = filterPos === 'ALL' || p.pos === filterPos;
      const matchSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.team.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPos && matchSearch;
    });

    const isJody = currentPreset === 'jody_koerner';
    const presetTitle = isJody ? 'Jody Smith & Sean Koerner Consensus Tiers' : 'SharpLineup Top 300 Rankings & Tiers';
    const presetDesc = isJody
      ? 'FantasyPros Expert Consensus Rankings & Positional Tiers (Jody Smith / Sean Koerner)'
      : '12-Team Half-PPR Snake Draft (Market Implied Projections & Tiers)';

    modalEl.innerHTML = `
      <div class="auth-modal-overlay" id="sl-modal-overlay" style="z-index: 10000; padding: 1.5rem; display: flex; align-items: center; justify-content: center;">
        <div class="glass-card" style="width: 100%; max-width: 1100px; max-height: 90vh; display: flex; flex-direction: column; background: #0f172a; border: 1px solid rgba(16, 185, 129, 0.3); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); border-radius: 12px; overflow: hidden;">
          
          <!-- Modal Header with Preset Switcher -->
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.8); flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <span style="font-size: 1.25rem;">🏆</span>
                <h2 style="font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0;">${presetTitle}</h2>
                <span style="background: ${isJody ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${isJody ? '#38bdf8' : '#34d399'}; font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 9999px; border: 1px solid ${isJody ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'};">
                  ${isJody ? 'FantasyPros Expert' : 'Market Implied'}
                </span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                ${presetDesc} • View-only reference (Active board is untouched)
              </p>
            </div>

            <!-- Preset Toggle Pills -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="display: flex; gap: 0.3rem; background: rgba(0,0,0,0.35); padding: 0.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <button class="btn-preset-toggle ${currentPreset === 'sharplineup' ? 'active' : ''}" data-preset="sharplineup" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; background: ${currentPreset === 'sharplineup' ? 'var(--accent-primary)' : 'transparent'}; color: ${currentPreset === 'sharplineup' ? '#fff' : 'var(--text-muted)'};">
                  🏈 SharpLineup
                </button>
                <button class="btn-preset-toggle ${currentPreset === 'jody_koerner' ? 'active' : ''}" data-preset="jody_koerner" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; background: ${currentPreset === 'jody_koerner' ? '#38bdf8' : 'transparent'}; color: ${currentPreset === 'jody_koerner' ? '#000' : 'var(--text-muted)'};">
                  📊 Jody / Koerner
                </button>
              </div>

              <button id="btn-sl-close" style="background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; padding: 0.2rem 0.5rem; line-height: 1; border-radius: 6px;">✕</button>
            </div>
          </div>

          <!-- Tab Bar & Controls -->
          <div style="padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; background: rgba(30, 41, 59, 0.4);">
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn-tab ${activeTab === 'table' ? 'active' : ''}" data-tab="table" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; cursor: pointer; background: ${activeTab === 'table' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'table' ? '#fff' : 'var(--text-muted)'}; border: 1px solid var(--border-color);">📊 Rankings Table (${players.length})</button>
              <button class="btn-tab ${activeTab === 'tiers' ? 'active' : ''}" data-tab="tiers" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; cursor: pointer; background: ${activeTab === 'tiers' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'tiers' ? '#fff' : 'var(--text-muted)'}; border: 1px solid var(--border-color);">🧱 Positional Tiers</button>
              <button class="btn-tab ${activeTab === 'yaml' ? 'active' : ''}" data-tab="yaml" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 6px; cursor: pointer; background: ${activeTab === 'yaml' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'yaml' ? '#fff' : 'var(--text-muted)'}; border: 1px solid var(--border-color);">📄 YAML Preview</button>
            </div>

            ${activeTab === 'table' ? `
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <input type="text" id="sl-search" placeholder="🔍 Search player..." value="${searchQuery}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem; border-radius: 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; width: 160px;">
                <div style="display: flex; gap: 0.25rem;">
                  <button class="pos-filter-btn ${filterPos === 'ALL' ? 'pos-active' : ''}" data-pos="ALL" style="padding: 0.25rem 0.5rem; font-size: 0.72rem; border-radius: 4px; border: 1px solid var(--border-color); background: ${filterPos === 'ALL' ? 'var(--accent-primary)' : 'transparent'}; color: #fff; cursor: pointer;">ALL</button>
                  ${positions.map(p => `
                    <button class="pos-filter-btn ${filterPos === p ? 'pos-active' : ''}" data-pos="${p}" style="padding: 0.25rem 0.5rem; font-size: 0.72rem; border-radius: 4px; border: 1px solid var(--border-color); background: ${filterPos === p ? 'var(--accent-primary)' : 'transparent'}; color: #fff; cursor: pointer;">${p}</button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Modal Body (Scrollable) -->
          <div style="flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem;">
            ${activeTab === 'table' ? `
              <table class="stat-table" style="width: 100%; font-size: 0.82rem;">
                <thead>
                  <tr style="position: sticky; top: 0; background: #0f172a; z-index: 2;">
                    <th style="width: 50px;">Rank</th>
                    <th>Player</th>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>Tier</th>
                    <th>Bye</th>
                    <th>Proj Pts</th>
                    <th>ECR</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredPlayers.map((p, idx) => `
                    <tr>
                      <td style="font-weight: 700; color: var(--accent-primary);">${p.ecr || idx + 1}</td>
                      <td style="font-weight: 700; color: #fff;">${p.name}</td>
                      <td><span class="pos-badge pos-${p.pos.toLowerCase()}">${p.pos}</span></td>
                      <td>${p.team}</td>
                      <td><span class="tier-badge">Tier ${p.tier || 1}</span></td>
                      <td>${p.bye || '—'}</td>
                      <td style="font-weight: 700; color: #34d399;">${p.projectedPts || '—'}</td>
                      <td style="color: var(--text-muted);">${p.ecr || idx + 1}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            ${activeTab === 'tiers' ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                ${positions.map(pos => {
                  const posPlayers = players.filter(p => p.pos === pos);
                  const tiersMap = {};
                  posPlayers.forEach(p => {
                    const t = p.tier || 1;
                    if (!tiersMap[t]) tiersMap[t] = [];
                    tiersMap[t].push(p);
                  });
                  const tierNums = Object.keys(tiersMap).map(Number).sort((a, b) => a - b);

                  return `
                    <div class="glass-card" style="padding: 1rem;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <span class="pos-badge pos-${pos.toLowerCase()}" style="font-size: 0.85rem; font-weight: 800;">${pos}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${posPlayers.length} players • ${tierNums.length} tiers</span>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${tierNums.map(t => `
                          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.65rem;">
                            <div style="font-size: 0.72rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 0.35rem;">
                              TIER ${t} (${tiersMap[t].length})
                            </div>
                            <div style="font-size: 0.75rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 0.2rem; max-height: 200px; overflow-y: auto;">
                              ${tiersMap[t].map((p, pIdx) => `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                  <span>${pIdx + 1}. ${p.name} <span style="color: var(--text-dim);">(${p.team})</span></span>
                                  <span style="color: #34d399; font-weight: 600; font-size: 0.7rem;">#${p.ecr || ''}</span>
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
            ` : ''}

            ${activeTab === 'yaml' ? `
              <div style="position: relative;">
                <pre style="background: #020617; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; color: #94a3b8; font-family: monospace; font-size: 0.75rem; overflow-x: auto; max-height: 55vh; white-space: pre;">${yaml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>
            ` : ''}
          </div>

          <!-- Modal Footer -->
          <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.9); flex-wrap: wrap; gap: 0.75rem;">
            <span style="font-size: 0.75rem; color: var(--text-dim);">
              Viewing ${isJody ? 'Jody/Koerner' : 'SharpLineup'} rankings. Your in-use tier board is NOT modified unless applied.
            </span>
            <div style="display: flex; gap: 0.75rem;">
              <button id="btn-sl-apply-board" class="btn-secondary" style="padding: 0.45rem 1rem; font-size: 0.8rem; cursor: pointer; color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);" title="Apply these rankings to your active tier board">
                📥 Apply ${isJody ? 'Jody/Koerner' : 'SharpLineup'} to Board
              </button>
              <button id="btn-sl-close-footer" class="btn-primary" style="padding: 0.45rem 1.25rem; font-size: 0.8rem; cursor: pointer;">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Attach event listeners
    modalEl.querySelector('#btn-sl-close')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#btn-sl-close-footer')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#sl-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'sl-modal-overlay') modalEl.remove();
    });

    modalEl.querySelectorAll('.btn-preset-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentPreset = e.currentTarget.dataset.preset;
        renderModalContent();
      });
    });

    modalEl.querySelectorAll('.btn-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeTab = e.currentTarget.dataset.tab;
        renderModalContent();
      });
    });

    const searchInput = modalEl.querySelector('#sl-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderModalContent();
      });
    }

    modalEl.querySelectorAll('.pos-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterPos = e.currentTarget.dataset.pos;
        renderModalContent();
      });
    });

    const btnApply = modalEl.querySelector('#btn-sl-apply-board');
    if (btnApply) {
      btnApply.addEventListener('click', async () => {
        const presetNameText = isJody ? 'Jody/Koerner' : 'SharpLineup';
        const confirmed = confirm(
          `Are you sure you want to load the ${presetNameText} rankings into your active board?\n\nThis will update your tiers and rankings.`
        );
        if (!confirmed) return;

        const ok = await store.loadPreset(currentPreset);
        if (ok) {
          alert(`✅ Applied ${presetNameText} rankings to your active tier board!`);
          modalEl.remove();
          if (typeof window.refreshPreDraftView === 'function') {
            window.refreshPreDraftView();
          }
        } else {
          alert(`❌ Failed to load ${presetNameText} rankings.`);
        }
      });
    }
  };

  renderModalContent();
}
