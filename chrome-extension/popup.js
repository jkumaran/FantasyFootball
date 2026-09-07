// Popup UI logic
document.addEventListener('DOMContentLoaded', async () => {
  const serverInput = document.getElementById('server-url');
  const passInput = document.getElementById('pass-code');
  const sessionSelect = document.getElementById('target-session');
  const saveBtn = document.getElementById('btn-save');
  const statusBadge = document.getElementById('status-badge');
  const historyList = document.getElementById('history-list');

  // Load saved config
  chrome.storage.local.get({
    serverUrl: 'http://localhost:3000',
    passCode: 'fantasy2025',
    targetSessionId: 'yahoo-1',
    recentPicks: []
  }, async (data) => {
    serverInput.value = data.serverUrl;
    passInput.value = data.passCode;
    sessionSelect.value = data.targetSessionId;
    renderHistory(data.recentPicks);

    // Fetch live sessions from server to populate dropdown
    try {
      const res = await fetch(`${data.serverUrl.replace(/\/+$/, '')}/api/draft/sessions`);
      if (res.ok) {
        const resData = await res.json();
        if (resData.sessions && resData.sessions.length > 0) {
          sessionSelect.innerHTML = resData.sessions.map(s => {
            const icon = s.platform === 'yahoo' ? '🟣' : s.platform === 'espn' ? '🔴' : s.platform === 'sleeper' ? '🔵' : '🎲';
            return `<option value="${s.id}" ${s.id === data.targetSessionId ? 'selected' : ''}>${icon} ${s.name}</option>`;
          }).join('');
        }
      }
    } catch (e) {}
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.innerText = 'Testing Connection...';
    const serverUrl = serverInput.value.trim();
    const passCode = passInput.value.trim();
    const targetSessionId = sessionSelect.value;

    await chrome.storage.local.set({ serverUrl, passCode, targetSessionId });

    try {
      const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/draft/sessions`);
      if (res.ok) {
        statusBadge.className = 'status-badge status-online';
        statusBadge.innerHTML = '<span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span> Connected to Server';
        saveBtn.innerText = 'Connected & Saved!';
      } else {
        throw new Error('Status ' + res.status);
      }
    } catch (e) {
      statusBadge.className = 'status-badge status-offline';
      statusBadge.innerHTML = '<span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span> Server Offline';
      saveBtn.innerText = 'Failed to connect';
    }

    setTimeout(() => {
      saveBtn.innerText = 'Save & Test Connection';
    }, 2000);
  });

  function renderHistory(picks) {
    if (!picks || picks.length === 0) {
      historyList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 8px 0;">No picks recorded yet.</div>';
      return;
    }
    historyList.innerHTML = picks.slice(0, 10).map(p => `
      <div class="history-item">
        <span style="font-weight: 700; color: #fff;">${p.playerName}</span>
        <span style="color: #38bdf8;">${p.pickNum ? '#' + p.pickNum : 'Pick'} (${p.timestamp})</span>
      </div>
    `).join('');
  }
});
