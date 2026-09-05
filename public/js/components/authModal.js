import { store } from '../store.js';

export function renderAuthModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const isAuthed = Boolean(store.getState().isAuthenticated);

  if (isAuthed) {
    container.innerHTML = `
      <div class="modal-backdrop open" id="auth-backdrop">
        <div class="modal-content" style="max-width: 460px;">
          <div class="modal-header">
            <div class="modal-title" style="display: flex; align-items: center; gap: 0.5rem; color: #34d399;">
              <span>🔓</span>
              <span>Board Editing Unlocked</span>
            </div>
            <button class="btn-icon" id="btn-close-auth-modal">✕</button>
          </div>

          <div class="modal-body">
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399;"></span>
                <strong style="color: #34d399; font-size: 0.9rem;">Authenticated Session Active</strong>
              </div>
              <p style="font-size: 0.8rem; color: #cbd5e1; margin: 0; line-height: 1.5;">
                Your local browser is verified with an HTTP session cookie. All edits to tiers, rankings, gaps, and drafted statuses are automatically saved to your server's <code>tier_board.yaml</code> file.
              </p>
            </div>

            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
              If you want to switch to view-only mode or are on a shared computer, you can lock the board below.
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <button class="btn-secondary" id="btn-cancel-auth-modal" style="padding: 0.5rem 1rem;">
                Done
              </button>
              <button class="btn-secondary" id="btn-lock-board" style="padding: 0.5rem 1rem; color: #f87171; border-color: rgba(239, 68, 68, 0.4); display: flex; align-items: center; gap: 0.4rem;">
                🔒 Lock Board (Sign Out)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const backdrop = document.getElementById('auth-backdrop');
    const closeBtn = document.getElementById('btn-close-auth-modal');
    const cancelBtn = document.getElementById('btn-cancel-auth-modal');
    const lockBtn = document.getElementById('btn-lock-board');

    const closeModal = () => {
      if (container) container.innerHTML = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    }

    if (lockBtn) {
      lockBtn.addEventListener('click', async () => {
        lockBtn.textContent = 'Locking...';
        lockBtn.disabled = true;
        await store.logout();
        closeModal();
      });
    }

    return;
  }

  // Locked: Prompt for Password
  container.innerHTML = `
    <div class="modal-backdrop open" id="auth-backdrop">
      <div class="modal-content" style="max-width: 480px;">
        <div class="modal-header">
          <div class="modal-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <span>🔒</span>
            <span>Unlock Board Editing</span>
          </div>
          <button class="btn-icon" id="btn-close-auth-modal">✕</button>
        </div>

        <form id="auth-login-form" class="modal-body">
          <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5;">
            Enter your passcode to unlock editing player tiers, shifting gaps, adding tiers, and saving to the server.
          </p>

          <!-- Password Field -->
          <div style="margin-bottom: 1.25rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fff; display: block; margin-bottom: 0.35rem;">
              Passcode
            </label>
            <div style="position: relative; display: flex; align-items: center;">
              <input
                type="password"
                id="auth-password-input"
                class="search-input"
                placeholder="Enter passcode (default: fantasy2025)"
                style="width: 100%; padding-right: 2.5rem; font-size: 0.9rem;"
                autocomplete="current-password"
                required
                autofocus
              >
              <button
                type="button"
                id="btn-toggle-password"
                style="position: absolute; right: 0.6rem; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1rem; padding: 0.2rem;"
                title="Show/hide password"
              >
                👁️
              </button>
            </div>
          </div>

          <!-- Session Duration Radios -->
          <div style="margin-bottom: 1.25rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #fff; display: block; margin-bottom: 0.5rem;">
              Remember Authentication On This Browser
            </label>

            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <label class="auth-duration-card" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s ease;">
                <input type="radio" name="auth-duration" value="30" checked style="margin-top: 0.2rem; cursor: pointer;">
                <div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">30 Days (Recommended)</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                    Set a 30-day cookie so you avoid retyping the passcode whenever you refresh or visit on this device.
                  </div>
                </div>
              </label>

              <label class="auth-duration-card" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s ease;">
                <input type="radio" name="auth-duration" value="1" style="margin-top: 0.2rem; cursor: pointer;">
                <div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">1 Day (24 Hours)</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                    Expires after 1 day. Best if you are drafting on a temporary or shared computer.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div id="auth-error-banner" style="display: none; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; margin-bottom: 1rem; color: #fca5a5; font-size: 0.8rem;"></div>

          <!-- Action Buttons -->
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button type="button" class="btn-secondary" id="btn-cancel-auth-modal" style="padding: 0.5rem 1rem;">
              Cancel
            </button>
            <button type="submit" class="btn-primary" id="btn-submit-auth" style="padding: 0.5rem 1.25rem; display: flex; align-items: center; gap: 0.4rem;">
              🔑 Unlock Board
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const backdrop = document.getElementById('auth-backdrop');
  const closeBtn = document.getElementById('btn-close-auth-modal');
  const cancelBtn = document.getElementById('btn-cancel-auth-modal');
  const form = document.getElementById('auth-login-form');
  const passwordInput = document.getElementById('auth-password-input');
  const togglePassBtn = document.getElementById('btn-toggle-password');
  const errorBanner = document.getElementById('auth-error-banner');
  const submitBtn = document.getElementById('btn-submit-auth');

  const closeModal = () => {
    if (container) container.innerHTML = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  // Toggle show/hide password
  if (togglePassBtn && passwordInput) {
    togglePassBtn.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassBtn.textContent = '🙈';
      } else {
        passwordInput.type = 'password';
        togglePassBtn.textContent = '👁️';
      }
    });
  }

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput ? passwordInput.value.trim() : '';
      if (!password) return;

      const durationRadios = form.querySelectorAll('input[name="auth-duration"]');
      let durationDays = 30;
      durationRadios.forEach(r => {
        if (r.checked) durationDays = parseInt(r.value, 10);
      });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Verifying...';
      }
      if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
      }

      const result = await store.login(password, durationDays);

      if (result.success) {
        closeModal();
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '🔑 Unlock Board';
        }
        if (errorBanner) {
          errorBanner.textContent = result.error || 'Incorrect passcode. Please try again.';
          errorBanner.style.display = 'block';
        }
        if (passwordInput) {
          passwordInput.focus();
          passwordInput.select();
        }
      }
    });
  }
}

// Global hooks for easy access from anywhere
if (typeof window !== 'undefined') {
  window.openAuthModal = renderAuthModal;
  window.onAuthRequired = renderAuthModal;
}
