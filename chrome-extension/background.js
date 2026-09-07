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
  const endpoint = `${config.serverUrl.replace(/\/+$/, '')}/api/draft/heartbeat`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handleDraftPick(pickData) {
  const config = await new Promise(resolve => chrome.storage.local.get(DEFAULT_CONFIG, resolve));
  if (!config.autoSync) {
    return { success: false, error: 'Auto-sync is disabled in extension settings' };
  }

  const endpoint = `${config.serverUrl.replace(/\/+$/, '')}/api/draft/sync-pick`;
  const payload = {
    ...pickData,
    sessionId: pickData.sessionId || config.targetSessionId,
    passCode: config.passCode
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Password': config.passCode
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    // Log to storage history
    const historyRes = await new Promise(resolve => chrome.storage.local.get({ recentPicks: [] }, resolve));
    const recent = historyRes.recentPicks || [];
    recent.unshift({
      timestamp: new Date().toLocaleTimeString(),
      pickNum: data.pickNum || pickData.pickNum,
      playerName: pickData.playerName,
      platform: pickData.platform,
      sessionId: payload.sessionId,
      status: data.success ? 'synced' : 'error'
    });
    if (recent.length > 25) recent.pop();
    await chrome.storage.local.set({ recentPicks: recent, lastSyncTime: Date.now() });

    return data;
  } catch (err) {
    console.error('[DraftBridge] Fetch sync failed:', err);
    return { success: false, error: err.message };
  }
}
