const state = {
  records: []
};

const api = {
  async list() {
    const result = await window.HR_PORTAL_SHEETS.request({
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    return result.records || [];
  },

  async submitReferral(payload) {
    const result = await window.HR_PORTAL_SHEETS.request({
      method: 'POST',
      body: JSON.stringify({ action: 'saveReferral', ...payload })
    });
    return result;
  }
};

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function refreshRecords() {
  const tableBody = document.querySelector('#recordsTable tbody');
  if (!tableBody) return;

  try {
    state.records = await api.list();
    tableBody.innerHTML = '';

    if (!state.records.length) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4">No records found yet.</td>';
      tableBody.appendChild(row);
      return;
    }

    state.records.forEach((record) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.name || '—'}</td>
        <td>${record.department || '—'}</td>
        <td>${record.status || 'Pending'}</td>
        <td>${record.updatedAt || record.createdAt || '—'}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    showStatus(error.message || 'Unable to load records.', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshRecords();

  const referralForm = document.getElementById('referralForm');
  if (referralForm) {
    referralForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(referralForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        showStatus('Submitting referral...');
        const result = await api.submitReferral(payload);
        showStatus(result.message || 'Referral saved successfully.');
        referralForm.reset();
        await refreshRecords();
      } catch (error) {
        showStatus(error.message || 'Failed to save referral.', true);
      }
    });
  }

  const refreshButton = document.getElementById('refreshRecords');
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshRecords);
  }
});
