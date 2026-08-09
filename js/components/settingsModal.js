/**
 * Settings & Import/Export Modal Component
 */
import { store } from '../store.js';

export function renderSettingsModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const state = store.getState();
  const { league } = state;

  container.innerHTML = `
    <div class="modal-backdrop open" id="settings-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">⚙️ League Settings & Data Backup</div>
          <button class="btn-icon" id="btn-close-modal">✕</button>
        </div>

        <div class="modal-body">
          <!-- League Settings Form -->
          <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-size: 0.9rem; color: #fff; margin-bottom: 0.75rem;">League Configuration</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Number of Teams</label>
                <select class="search-input" id="setting-teams" style="width: 100%;">
                  ${[8, 10, 12, 14, 16].map(num => `<option value="${num}" ${num === league.teamsCount ? 'selected' : ''}>${num} Teams</option>`).join('')}
                </select>
              </div>

              <div>
                <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Your Draft Position</label>
                <select class="search-input" id="setting-slot" style="width: 100%;">
                  ${Array.from({ length: league.teamsCount || 12 }, (_, i) => i + 1).map(s => `<option value="${s}" ${s === league.userSlot ? 'selected' : ''}>Slot #${s}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-dim);">
              Draft Format: <strong>Snake</strong> • Scoring: <strong>Half-PPR</strong>
            </div>
          </div>

          <!-- Import / Export Section -->
          <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-size: 0.9rem; color: #fff; margin-bottom: 0.5rem;">Export / Backup Suite Data</div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              Download your custom player rankings, tiers, and draft history as a JSON backup.
            </p>
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn-secondary" id="btn-export-data">
                📥 Export Backup (JSON)
              </button>
              <label class="btn-secondary" style="cursor: pointer;">
                📤 Import Backup (JSON)
                <input type="file" id="input-import-file" accept=".json" style="display: none;">
              </label>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
            <button class="btn-primary" id="btn-save-settings">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const backdrop = container.querySelector('#settings-backdrop');
  const closeBtn = container.querySelector('#btn-close-modal');
  const saveBtn = container.querySelector('#btn-save-settings');
  const exportBtn = container.querySelector('#btn-export-data');
  const importInput = container.querySelector('#input-import-file');

  const closeModal = () => {
    container.innerHTML = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const teamsCount = parseInt(container.querySelector('#setting-teams').value, 10);
      const userSlot = parseInt(container.querySelector('#setting-slot').value, 10);
      store.updateLeagueSettings({ teamsCount, userSlot });
      closeModal();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.getState(), null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `fantasy_football_suite_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const success = store.importData(event.target.result);
          if (success) {
            alert('Backup successfully imported!');
            closeModal();
            location.reload();
          } else {
            alert('Invalid backup file format.');
          }
        };
        reader.readAsText(file);
      }
    });
  }
}
