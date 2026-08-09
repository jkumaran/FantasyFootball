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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
