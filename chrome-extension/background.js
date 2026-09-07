// Cameron's Fantasy Draft Bridge - Service Worker
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:3000',
  passCode: 'fantasy2025',
  targetSessionId: 'yahoo-1',
  autoSync: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULT_CONFIG, (data) => {
    chrome.storage.local.set(data);
    console.log('[DraftBridge] Installed with config:', data);
  });
});

// Relay picks to local backend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'HEARTBEAT') {
    handleHeartbeat(request.payload).then(res => {
      sendResponse(res);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (request.type === 'DRAFT_PICK') {
    handleDraftPick(request.payload).then(res => {
      sendResponse(res);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // async
  }

  if (request.type === 'GET_CONFIG') {
    chrome.storage.local.get(DEFAULT_CONFIG, (config) => {
      sendResponse(config);
    });
    return true;
  }
});

async function handleHeartbeat(payload) {
  const config = await new Promise(resolve => chrome.storage.local.get(DEFAULT_CONFIG, resolve));
  const targets = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    (config.serverUrl || '').replace(/\/+$/, ''),
    'https://fantasy-football-suite.onrender.com'
  ].filter(Boolean));

  let lastRes = { success: false };
  for (const base of targets) {
    try {
      const res = await fetch(`${base}/api/draft/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        lastRes = await res.json();
      }
    } catch (e) {}
  }
  return lastRes;
}

async function handleDraftPick(pickData) {
  const config = await new Promise(resolve => chrome.storage.local.get(DEFAULT_CONFIG, resolve));
  if (config.autoSync === false) {
    return { success: false, error: 'Auto-sync is disabled in extension settings' };
  }

  const payload = {
    ...pickData,
    sessionId: pickData.sessionId || config.targetSessionId || 'yahoo-1',
    passCode: config.passCode || 'fantasy2025'
  };

  const targets = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    (config.serverUrl || '').replace(/\/+$/, ''),
    'https://fantasy-football-suite.onrender.com'
  ].filter(Boolean));

  let lastRes = { success: false };
  for (const base of targets) {
    try {
      const res = await fetch(`${base}/api/draft/sync-pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Password': config.passCode || 'fantasy2025'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        lastRes = await res.json();
      }
    } catch (e) {}
  }

  // Log to storage history
  try {
    const historyRes = await new Promise(resolve => chrome.storage.local.get({ recentPicks: [] }, resolve));
    const recent = historyRes.recentPicks || [];
    recent.unshift({
      timestamp: new Date().toLocaleTimeString(),
      pickNum: lastRes.pickNum || pickData.pickNum,
      playerName: pickData.playerName,
      platform: pickData.platform,
      sessionId: payload.sessionId,
      status: lastRes.success ? 'synced' : 'error'
    });
    if (recent.length > 25) recent.pop();
    await chrome.storage.local.set({ recentPicks: recent, lastSyncTime: Date.now() });
  } catch (e) {}

  return lastRes;
}
