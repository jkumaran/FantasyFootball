# Cameron's Fantasy Draft Bridge (Chrome Extension)

A lightweight browser extension that connects live draft rooms on **Yahoo**, **ESPN**, and **Sleeper** directly to **Cameron's Fantasy Football Live Draft War Room**.

Every pick made by any team in your league is captured automatically via real-time DOM & mutation listeners and synced straight into your live draft board.

---

## 🚀 Quick Setup Instructions (30 Seconds)

1. Open **Google Chrome** (or Brave, Edge).
2. Go to the address: `chrome://extensions`.
3. In the top-right corner, switch **"Developer mode"** to **ON**.
4. Click the **"Load unpacked"** button in the top-left corner.
5. In the file picker, select this folder:
   ```
   /Users/kumaran/Documents/FantasyFootball/chrome-extension
   ```
6. The extension **"Cameron's Fantasy Draft Bridge"** is now installed!
7. Click the extension puzzle icon in your Chrome toolbar and pin it.

---

## ⚙️ Configuration

1. Click the **Cameron's Draft Bridge** icon in your toolbar.
2. Confirm your settings:
   - **Server URL:** `http://localhost:3000`
   - **Passcode:** `fantasy2025`
   - **Target Draft Room:** Select your active league (e.g. *Yahoo: League 1*, *ESPN: League 2*, or *Sleeper: League 3*).
3. Click **"Save & Test Connection"** to see the green **"Connected"** confirmation.

---

## 🏈 Live Drafting Workflow

1. Open **Cameron's Fantasy Football Live Draft War Room** at `http://localhost:3000/#view-livedraft`.
2. In another tab, open your draft room on **Yahoo Fantasy**, **ESPN Fantasy**, or **Sleeper**.
3. You will see a green floating pill in the bottom-right of your draft room tab:
   ```
   🟣 Cameron Bridge: Yahoo Draft Sync Active
   ```
4. As commissioner or other league members make their picks, they will instantly sync into your War Room board, crossing players off the pool, updating survival odds, and recommending your optimal pick in real time!
