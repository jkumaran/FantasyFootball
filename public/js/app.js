import { store } from './store.js';
import { api } from './api.js';
import { renderPreDraftView } from './components/preDraftView.js';
import { renderLiveDraftView } from './components/liveDraftView.js';
import { renderWeeklyView } from './components/weeklyView.js';
import { renderSettingsModal } from './components/settingsModal.js';

let currentTab = 'predraft';

function renderCurrentView() {
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => sec.classList.remove('active'));

  const activeSec = document.getElementById(`view-${currentTab}`);
  if (activeSec) activeSec.classList.add('active');

  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    if (tab.dataset.tab === currentTab) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  if (currentTab === 'predraft') renderPreDraftView();
  else if (currentTab === 'livedraft') renderLiveDraftView();
  else if (currentTab === 'weekly') renderWeeklyView();
}

function initApp() {
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      currentTab = e.currentTarget.dataset.tab;
      renderCurrentView();
    });
  });

  const btnSettings = document.getElementById('btn-open-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      renderSettingsModal();
    });
  }

  const btnSyncNews = document.getElementById('btn-sync-news');
  if (btnSyncNews) {
    btnSyncNews.addEventListener('click', async () => {
      btnSyncNews.innerText = '⏳ Syncing...';
      const result = await api.syncNews();
      btnSyncNews.innerText = '📡 Sync News';
      if (result && result.success) {
        alert(`✅ NFL News Synced! Fetched ${result.news.articles.length} live headlines.`);
      } else {
        alert('ℹ️ News sync finished.');
      }
    });
  }

  store.subscribe(() => {
    renderCurrentView();
  });

  renderCurrentView();
  initDeployWatcher();
}

function initDeployWatcher() {
  const banner = document.getElementById('deploy-notification-banner');
  const statusPill = document.getElementById('header-deploy-status');
  let isWaitingForReload = false;

  async function checkStatus() {
    try {
      const status = await api.getDeployStatus();
      if (!status || !status.success) return;

      if (statusPill) {
        const dot = statusPill.querySelector('.status-dot');
        const text = statusPill.querySelector('.status-text');
        if (status.isDeploying) {
          if (dot) dot.className = 'status-dot building';
          if (text) text.textContent = `Deploying #${status.latestCommit}`;
        } else {
          if (dot) dot.className = 'status-dot';
          if (text) text.textContent = `Live #${status.currentCommit}`;
        }
      }

      if (status.isDeploying) {
        isWaitingForReload = true;
        if (banner) {
          banner.style.display = 'flex';
          banner.className = 'deploy-banner building';
          banner.innerHTML = `
            <div class="deploy-banner-inner">
              <span style="font-size: 1rem;">⏳</span>
              <span><strong>Render is building & deploying an update</strong> (Commit <code>#${status.latestCommit}</code>)... Waiting to deploy...</span>
              <span style="opacity: 0.85; font-size: 0.75rem;">(The page will automatically show the new update once ready)</span>
            </div>
          `;
        }
      } else if (isWaitingForReload) {
        if (banner) {
          banner.style.display = 'flex';
          banner.className = 'deploy-banner ready';
          banner.innerHTML = `
            <div class="deploy-banner-inner">
              <span>🚀 <strong>Deployment Complete!</strong> Loading newest version (<code>#${status.currentCommit}</code>)...</span>
            </div>
          `;
        }
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        if (banner) banner.style.display = 'none';
      }
    } catch (e) {
      // Quiet fail
    }
  }

  checkStatus();
  setInterval(checkStatus, 4000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
