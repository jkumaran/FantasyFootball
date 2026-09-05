import { store } from '../store.js';

export function renderAuthGate() {
  const container = document.getElementById('view-auth');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-gate-container">
      <div class="glass-card auth-gate-card">
        <div class="auth-gate-header">
          <div class="auth-gate-icon">🏈</div>
          <h1 class="auth-gate-title">Gridiron Strategy Suite</h1>
          <div class="auth-gate-badge">🔒 Private War Room • Passcode Required</div>
        </div>

        <div class="auth-gate-body">
          <p class="auth-gate-desc">
            This fantasy football strategy suite and tier board are private. Enter your passcode to unlock your customized draft rankings, live war room, and tier board.
          </p>

          <form id="auth-gate-form">
            <!-- Passcode Input -->
            <div class="gate-form-group">
              <label for="gate-password-input" class="gate-label">Passcode</label>
              <div class="gate-input-wrapper">
                <input
                  type="password"
                  id="gate-password-input"
                  class="search-input gate-input"
                  placeholder="Enter access passcode..."
                  autocomplete="current-password"
                  required
                  autofocus
                >
                <button
                  type="button"
                  id="btn-gate-toggle-password"
                  class="gate-toggle-pass"
                  title="Show/hide passcode"
                >
                  👁️
                </button>
              </div>
            </div>

            <!-- Session Duration Selector -->
            <div class="gate-form-group">
              <label class="gate-label">Session Duration (Cookie)</label>
              <div class="gate-duration-cards">
                <label class="auth-duration-card">
                  <input type="radio" name="gate-duration" value="30" checked>
                  <div class="duration-info">
                    <div class="duration-title">30 Days (Recommended)</div>
                    <div class="duration-desc">
                      Avoid entering the passcode again on this device/browser for 1 month.
                    </div>
                  </div>
                </label>

                <label class="auth-duration-card">
                  <input type="radio" name="gate-duration" value="1">
                  <div class="duration-info">
                    <div class="duration-title">1 Day (24 Hours)</div>
                    <div class="duration-desc">
                      Expires after 24 hours. Best for temporary or public computers.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Error Banner -->
            <div id="gate-error-banner" class="gate-error-alert" style="display: none;"></div>

            <!-- Submit Button -->
            <button type="submit" id="btn-gate-submit" class="btn-primary gate-submit-btn">
              <span>🔑</span>
              <span>Unlock & Enter Suite</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#auth-gate-form');
  const passwordInput = container.querySelector('#gate-password-input');
  const togglePassBtn = container.querySelector('#btn-gate-toggle-password');
  const errorBanner = container.querySelector('#gate-error-banner');
  const submitBtn = container.querySelector('#btn-gate-submit');

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

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput ? passwordInput.value.trim() : '';
      if (!password) return;

      const durationRadios = form.querySelectorAll('input[name="gate-duration"]');
      let durationDays = 30;
      durationRadios.forEach(r => {
        if (r.checked) durationDays = parseInt(r.value, 10);
      });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳</span><span>Verifying Passcode...</span>';
      }
      if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
      }

      const result = await store.login(password, durationDays);

      if (result.success) {
        // App listener on store will react and switch from auth gate to predraft view
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>🔑</span><span>Unlock & Enter Suite</span>';
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
