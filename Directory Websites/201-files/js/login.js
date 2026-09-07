const API_BASE = 'http://localhost:8787';
const form = document.getElementById('loginForm');
const status = document.getElementById('loginStatus');

async function checkExistingSession() {
  try {
    const response = await fetch(`${API_BASE}/auth/session`, { credentials: 'include' });
    if (response.ok) window.location.replace('index.html');
  } catch {
    status.textContent = 'The HR authentication service is unavailable.';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = 'Checking credentials...';
  const button = form.querySelector('button');
  button.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: form.user.value, password: form.password.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Sign in failed');
    window.location.replace('index.html');
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});

checkExistingSession();
