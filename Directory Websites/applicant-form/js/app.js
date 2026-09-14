const API_URL = 'https://script.google.com/macros/s/AKfycbzw10235KTU6EvGNRVtBazNQayZrBLWh5UwIWl7wsJjykh4X1dfifZcr57no_d3tN5-qw/exec';

const form = document.getElementById('applicantForm');
const statusBox = document.getElementById('statusBox');
const tableBody = document.getElementById('applicantTableBody');
const resumeUploadBox = document.getElementById('resumeUploadBox');
const resumeInput = document.getElementById('resumeInput');
const resumePreview = document.getElementById('resumePreview');
const resumeName = document.getElementById('resumeName');

let uploadedResume = null;

async function request(options = {}, extraUrl = '') {
  const response = await fetch(`${API_URL}${extraUrl}`, {
    ...options,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let result = {};
  try { result = raw ? JSON.parse(raw) : {}; } catch (error) { throw new Error(`Invalid API response (${response.status}).`); }

  if (!response.ok || result.ok === false) {
    throw new Error(result && result.error ? result.error : 'Request failed');
  }

  return result;
}

function showStatus(message, type = 'success') {
  statusBox.className = 'status-box ' + type;
  statusBox.textContent = message;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function handleResumeSelection(file) {
  if (!file) return;
  uploadedResume = {
    dataUrl: await readFileAsDataURL(file),
    name: file.name,
    mimeType: file.type || 'application/octet-stream'
  };
  resumeName.textContent = file.name;
  resumePreview.style.display = 'inline-flex';
}

resumeUploadBox.addEventListener('click', () => resumeInput.click());
resumeInput.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) await handleResumeSelection(file);
});

['dragenter', 'dragover'].forEach(type => {
  resumeUploadBox.addEventListener(type, (event) => {
    event.preventDefault();
    resumeUploadBox.style.borderColor = '#2d6ea5';
  });
});

['dragleave', 'drop'].forEach(type => {
  resumeUploadBox.addEventListener(type, (event) => {
    event.preventDefault();
    resumeUploadBox.style.borderColor = '#dfe7f3';
  });
});

resumeUploadBox.addEventListener('drop', async (event) => {
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) await handleResumeSelection(file);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    id: 'APP-' + Date.now(),
    fullName: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    positionApplied: document.getElementById('positionApplied').value.trim(),
    department: document.getElementById('department').value.trim(),
    source: document.getElementById('source').value,
    availabilityDate: document.getElementById('availabilityDate').value,
    status: document.getElementById('status').value || 'New',
    remarks: document.getElementById('remarks').value.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    resumeData: uploadedResume ? uploadedResume.dataUrl : '',
    resumeFileName: uploadedResume ? uploadedResume.name : '',
    resumeMimeType: uploadedResume ? uploadedResume.mimeType : '',
    resumeLink: ''
  };

  if (!payload.fullName || !payload.email || !payload.phone || !payload.positionApplied || !payload.department || !payload.source) {
    showStatus('Please complete all required fields.', 'error');
    return;
  }

  try {
    const result = await request({
      method: 'POST',
      body: JSON.stringify({ action: 'save-applicant', record: payload })
    });

    showStatus('Application submitted successfully.', 'success');
    form.reset();
    uploadedResume = null;
    resumePreview.style.display = 'none';
    resumeName.textContent = '';
    renderApplicants();
    console.log('Applicant saved:', result.record);
  } catch (error) {
    showStatus(error.message || 'Something went wrong while submitting your application.', 'error');
  }
});

async function renderApplicants() {
  try {
    const result = await request({ method: 'GET' }, '?action=applicant-list');
    const records = result.records || [];
    if (!Array.isArray(records) || records.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3" class="empty">No applicants yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = records.slice(0, 8).map(record => `
      <tr>
        <td>${record.fullName || '—'}</td>
        <td>${record.positionApplied || '—'}</td>
        <td><span class="badge">${record.status || 'New'}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="3" class="empty">Unable to load applicants.</td></tr>';
  }
}

(async function init() {
  await renderApplicants();
})();
