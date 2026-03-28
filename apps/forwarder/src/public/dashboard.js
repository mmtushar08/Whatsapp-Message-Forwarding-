const storageKey = 'wa-forwarder-admin-token';

const authPanel = document.getElementById('auth-panel');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('auth-form');
const settingsForm = document.getElementById('settings-form');
const authFeedback = document.getElementById('auth-feedback');
const settingsFeedback = document.getElementById('settings-feedback');
const tokenInput = document.getElementById('admin-token');

function getToken() {
  return window.localStorage.getItem(storageKey) || '';
}

function setToken(token) {
  window.localStorage.setItem(storageKey, token);
}

function clearToken() {
  window.localStorage.removeItem(storageKey);
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (token) {
    headers.set('x-admin-token', token);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) {
        message = body.error;
      }
    } catch {}

    throw new Error(message);
  }

  return response;
}

function showDashboard(isVisible) {
  authPanel.classList.toggle('hidden', isVisible);
  dashboard.classList.toggle('hidden', !isVisible);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderMessages(messages) {
  const table = document.getElementById('messages-table');

  if (!messages.length) {
    table.innerHTML = '<tr><td colspan="5">No messages yet.</td></tr>';
    return;
  }

  table.innerHTML = messages
    .map((item) => {
      const statusClass = item.status === 'success' ? 'status-success' : 'status-failed';
      const statusLabel = item.status === 'success' ? 'Forwarded' : 'Failed';
      return `
        <tr>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td>${item.from_number}</td>
          <td>${item.to_number}</td>
          <td>${item.message}</td>
          <td>${new Date(item.forwarded_at).toLocaleString()}</td>
        </tr>
      `;
    })
    .join('');
}

async function loadHealth() {
  const response = await fetch('/health');
  const payload = await response.json();
  setText('health-status', payload.status === 'ok' ? 'Online' : 'Unavailable');
  setText('health-timestamp', new Date(payload.timestamp).toLocaleString());
}

async function loadDashboard() {
  const [settingsResponse, statsResponse, messagesResponse] = await Promise.all([
    apiFetch('/config/settings'),
    apiFetch('/messages/stats'),
    apiFetch('/messages?limit=20'),
  ]);

  const settingsPayload = await settingsResponse.json();
  const statsPayload = await statsResponse.json();
  const messagesPayload = await messagesResponse.json();
  const settings = settingsPayload.settings;

  document.getElementById('phone-number').value = settings.forwardToNumber || '';
  document.getElementById('keyword-filters').value = settings.keywordFilters.join(', ');
  document.getElementById('forwarding-enabled').checked = settings.forwardingEnabled;

  setText('stats-total', String(statsPayload.total));
  setText('stats-success', `${statsPayload.success} successful forwards`);
  setText('stats-failed', String(statsPayload.failed));
  setText(
    'forwarding-state',
    settings.forwardingEnabled ? 'Forwarding active' : 'Forwarding paused',
  );
  setText('webhook-path', settingsPayload.meta.webhookPath);
  setText('health-path', settingsPayload.meta.healthPath);
  setText('docs-path', settingsPayload.meta.docsPath);
  setText(
    'active-filters',
    settings.keywordFilters.length ? settings.keywordFilters.join(', ') : 'All messages',
  );

  renderMessages(messagesPayload.data || []);
}

async function bootstrapDashboard() {
  const token = getToken();
  if (!token) {
    showDashboard(false);
    return;
  }

  tokenInput.value = token;

  try {
    await Promise.all([loadHealth(), loadDashboard()]);
    authFeedback.textContent = '';
    settingsFeedback.textContent = '';
    showDashboard(true);
  } catch (error) {
    clearToken();
    authFeedback.textContent = error.message;
    showDashboard(false);
  }
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  authFeedback.textContent = 'Checking token...';
  setToken(tokenInput.value.trim());

  try {
    await Promise.all([loadHealth(), loadDashboard()]);
    authFeedback.textContent = '';
    showDashboard(true);
  } catch (error) {
    clearToken();
    authFeedback.textContent = error.message;
    showDashboard(false);
  }
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsFeedback.textContent = 'Saving settings...';

  const phoneNumber = document.getElementById('phone-number').value.trim();
  const keywordFilters = document.getElementById('keyword-filters').value.trim();
  const forwardingEnabled = document.getElementById('forwarding-enabled').checked;

  try {
    await apiFetch('/config/settings', {
      method: 'PATCH',
      body: JSON.stringify({ phoneNumber, keywordFilters, forwardingEnabled }),
    });
    settingsFeedback.textContent = 'Settings saved.';
    await loadDashboard();
  } catch (error) {
    settingsFeedback.textContent = error.message;
  }
});

document.getElementById('refresh-dashboard').addEventListener('click', async () => {
  settingsFeedback.textContent = 'Refreshing dashboard...';
  try {
    await Promise.all([loadHealth(), loadDashboard()]);
    settingsFeedback.textContent = 'Dashboard refreshed.';
  } catch (error) {
    settingsFeedback.textContent = error.message;
  }
});

document.getElementById('logout').addEventListener('click', () => {
  clearToken();
  settingsFeedback.textContent = '';
  showDashboard(false);
});

document.getElementById('clear-token').addEventListener('click', () => {
  clearToken();
  tokenInput.value = '';
  authFeedback.textContent = 'Saved token cleared.';
});

bootstrapDashboard();
