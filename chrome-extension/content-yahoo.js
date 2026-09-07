// Content script for Yahoo Fantasy Draft Rooms
(() => {
  console.log('[DraftBridge] Yahoo Fantasy Draft Observer Active');

  const seenPicks = new Set();
  let pillEl = null;

  const leagueMatch = window.location.href.match(/\/f1\/(\d+)/);
  const leagueId = leagueMatch ? leagueMatch[1] : null;
  const isDraftClient = window.location.href.includes('draftclient') || window.location.href.includes('draft');

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
      box-shadow: 0 6px 24px rgba(0,0,0,0.6);
      border-radius: 20px;
      padding: 6px 15px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(8px);
      user-select: none;
      pointer-events: auto;
    `;
    const label = isDraftClient
      ? `🟣 Cameron Bridge: Yahoo Draft Sync Active${leagueId ? ` (#${leagueId})` : ''}`
      : `🟣 Cameron Bridge: Yahoo League #${leagueId || '1548819'} Linked`;
    pillEl.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399;"></span>
      <span>${label}</span>
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
      'table.draft-board td.picked',
      '[data-tst="draft-board-cell"]',
      '[data-tst="draft-results-table"] tr',
      'div[class*="draftResult"]',
      'div[class*="DraftResult"]',
      'div[class*="PickRow"]',
      'div[class*="pick-row"]',
      'div[class*="completedPick"]',
      'div[class*="CompletedPick"]',
      'ul[class*="Picks"] li',
      '.draft-history-list li',
      '.draft-history li',
      'table.draft-board td[data-player]',
      'div[class*="GridCell"][class*="picked"]',
      'div[class*="DraftPick"]'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    elements.forEach(row => {
      try {
        const text = row.innerText.trim();
        if (!text || text.length < 3) return;

        // Try extracting Pick # and Player Name
        let pickNum = null;
        const pickMatch = text.match(/(?:Pick|#)\s*(\d+)/i) || 
                          text.match(/^(\d+)\.?\s+/) ||
                          text.match(/Round\s*\d+,\s*Pick\s*\d+\s*\((\d+)\s*overall\)/i) ||
                          text.match(/\((\d+)\s*overall\)/i);
        if (pickMatch) {
          pickNum = parseInt(pickMatch[1], 10);
        }

        // Search for name
        let playerName = null;
        const linkEl = row.querySelector('a[href*="/nfl/players/"], a[href*="sports.yahoo.com/nfl/players/"], .name, .player-name, [class*="playerName"], [class*="PlayerName"]');
        if (linkEl && linkEl.innerText.trim() && linkEl.innerText.trim().length > 2) {
          playerName = linkEl.innerText.trim();
        }
        if (!playerName) {
          const nameAttr = row.getAttribute('data-player-name') || row.querySelector('[data-player-name]')?.getAttribute('data-player-name');
          if (nameAttr) playerName = nameAttr.trim();
        }
        if (!playerName) {
          // Yahoo format typically: "1. Ja'Marr Chase (Cin - WR)" or similar
          const nameMatch = text.match(/([A-Z][a-zA-Z'.\-]+(?:\s+[A-Z][a-zA-Z'.\-]+)+)/);
          if (nameMatch) playerName = nameMatch[1].trim();
        }

        if (!playerName) return;

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
          leagueId,
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

  // Initial scan and regular periodic poll every 2s
  scanDraftTable();
  setInterval(scanDraftTable, 2000);
})();
