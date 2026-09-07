const form = document.getElementById('loginForm');
const status = document.getElementById('loginStatus');
form.addEventListener('submit', event => {
  event.preventDefault();
  status.textContent = 'Secure file storage is not configured yet.';
});
