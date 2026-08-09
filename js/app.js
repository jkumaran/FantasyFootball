/**
 * Main Application Controller & View Router
 */
import { store } from './store.js';
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

  // Highlight Nav Tab
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    if (tab.dataset.tab === currentTab) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Call View Renderer
  if (currentTab === 'predraft') renderPreDraftView();
  else if (currentTab === 'livedraft') renderLiveDraftView();
  else if (currentTab === 'weekly') renderWeeklyView();
}

function initApp() {
  // Navigation Listener
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      currentTab = e.currentTarget.dataset.tab;
      renderCurrentView();
    });
  });

  // Settings Button Listener
  const btnSettings = document.getElementById('btn-open-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      renderSettingsModal();
    });
  }

  // Subscribe Store Changes
  store.subscribe(() => {
    renderCurrentView();
  });

  // Initial Render
  renderCurrentView();
}

// Boot app on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
