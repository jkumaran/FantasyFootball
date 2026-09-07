// Content script for Sleeper Draft Rooms
(() => {
  console.log('[DraftBridge] Sleeper Draft Observer Active');

  const seenPicks = new Set();
  let pillEl = null;

  function createStatusPill() {
    if (pillEl) return;
    pillEl = document.createElement('div');
    pillEl.id = 'draft-bridge-pill';
    pillEl.style.cssText = `
      position: fixed;
      bottom: 18px;
      right: 18px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #38bdf8;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      border-radius: 20px;
      padding: 6px 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(8px);
      pointer-events: none;
    `;
    pillEl.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399;"></span>
      <span>🔵 Cameron Bridge: Sleeper Draft Sync Active</span>
    `;
    document.body.appendChild(pillEl);
  }

  function updateStatus(msg, isSuccess = true) {
    if (!pillEl) createStatusPill();
    if (pillEl) {
      pillEl.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isSuccess ? '#34d399' : '#f59e0b'}; box-shadow: 0 0 8px ${isSuccess ? '#34d399' : '#f59e0b'};"></span>
        <span>🔵 ${msg}</span>
      `;
    }
  }

  function scanDraftTable() {
    createStatusPill();

    const selectors = [
      '.draft-cell.picked',
      '.cell-picked',
      'div[class*="draft_cell"][class*="picked"]',
      'div[class*="pick-item"]',
      '.chat-message-pick'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    elements.forEach(cell => {
      try {
        const text = cell.innerText.trim();
        if (!text || text.length < 4) return;

        let pickNum = null;
        const pickMatch = text.match(/(?:Pick|#)\s*(\d+)/i) || text.match(/^(\d+)\.?\s+/);
        if (pickMatch) pickNum = parseInt(pickMatch[1], 10);

        const nameMatch = text.match(/([A-Z][a-zA-Z'.\-]+(?:\s+[A-Z][a-zA-Z'.\-]+)+)/);
        if (!nameMatch) return;
        const playerName = nameMatch[1].trim();

        let pos = null;
        const posMatch = text.match(/\b(QB|RB|WR|TE|DEF|DST|K)\b/i);
        if (posMatch) pos = posMatch[1].toUpperCase();

        let team = null;
        const teamMatch = text.match(/\b(ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|HOU|IND|JAX|KC|LV|LAC|LAR|MIA|MIN|NE|NO|NYG|NYJ|PHI|PIT|SF|SEA|TB|TEN|WAS)\b/i);
        if (teamMatch) team = teamMatch[1].toUpperCase();

        const pickKey = `${pickNum || 'x'}:${playerName.toLowerCase()}`;
        if (seenPicks.has(pickKey)) return;
        seenPicks.add(pickKey);

        const payload = {
          platform: 'sleeper',
          pickNum,
          playerName,
          pos,
          team
        };

        console.log('[DraftBridge] Detected Sleeper Pick:', payload);
        chrome.runtime.sendMessage({ type: 'DRAFT_PICK', payload }, (res) => {
          if (res && res.success) {
            updateStatus(`Synced: ${playerName} (Pick #${res.pickNum || pickNum || ''})`);
          }
        });
      } catch (e) {}
    });
  }

  const observer = new MutationObserver(() => scanDraftTable());
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(scanDraftTable, 2500);
})();
