// Content script for Yahoo Fantasy Draft Rooms
(() => {
  console.log('[DraftBridge] Yahoo Fantasy Draft Observer Active');

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
      <span>🟣 Cameron Bridge: Yahoo Draft Sync Active</span>
    `;
    document.body.appendChild(pillEl);
  }

  function updateStatus(msg, isSuccess = true) {
    if (!pillEl) createStatusPill();
    if (pillEl) {
      pillEl.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isSuccess ? '#34d399' : '#f59e0b'}; box-shadow: 0 0 8px ${isSuccess ? '#34d399' : '#f59e0b'};"></span>
        <span>🟣 ${msg}</span>
      `;
    }
  }

  function scanDraftTable() {
    createStatusPill();

    // Selectors for Yahoo Draft Results & Picks Feed
    const selectors = [
      '#draft-results tr',
      '.draft-table tr',
      '.ysf-draft-picks tr',
      'div[data-tst="draft-result"]',
      'li.draft-result',
      'table.draft-board td.picked'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    elements.forEach(row => {
      try {
        const text = row.innerText.trim();
        if (!text || text.length < 5) return;

        // Try extracting Pick # and Player Name
        let pickNum = null;
        const pickMatch = text.match(/(?:Pick|#)\s*(\d+)/i) || text.match(/^(\d+)\.?\s+/);
        if (pickMatch) {
          pickNum = parseInt(pickMatch[1], 10);
        }

        // Search for name and pos
        // Yahoo format typically: "1. Ja'Marr Chase (Cin - WR)" or similar
        const nameMatch = text.match(/([A-Z][a-zA-Z'.\-]+(?:\s+[A-Z][a-zA-Z'.\-]+)+)/);
        if (!nameMatch) return;
        const playerName = nameMatch[1].trim();

        // Extract pos if present
        let pos = null;
        const posMatch = text.match(/\b(QB|RB|WR|TE|DST|DEF|K)\b/i);
        if (posMatch) pos = posMatch[1].toUpperCase();

        // Extract NFL team if present
        let team = null;
        const teamMatch = text.match(/\b(ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|HOU|IND|JAX|KC|LV|LAC|LAR|MIA|MIN|NE|NO|NYG|NYJ|PHI|PIT|SF|SEA|TB|TEN|WAS)\b/i);
        if (teamMatch) team = teamMatch[1].toUpperCase();

        const pickKey = `${pickNum || 'x'}:${playerName.toLowerCase()}`;
        if (seenPicks.has(pickKey)) return;
        seenPicks.add(pickKey);

        const payload = {
          platform: 'yahoo',
          pickNum,
          playerName,
          pos,
          team
        };

        console.log('[DraftBridge] Detected Yahoo Pick:', payload);
        chrome.runtime.sendMessage({ type: 'DRAFT_PICK', payload }, (res) => {
          if (res && res.success) {
            updateStatus(`Synced: ${playerName} (Pick #${res.pickNum || pickNum || ''})`);
          }
        });
      } catch (e) {}
    });
  }

  // Observe DOM changes
  const observer = new MutationObserver(() => {
    scanDraftTable();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Regular periodic poll every 2.5s
  setInterval(scanDraftTable, 2500);
})();
