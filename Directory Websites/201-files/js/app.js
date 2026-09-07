const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://hr-portal-6cc0.onrender.com';
let records = [];
const tableBody = document.getElementById('employeeRows');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const recordCount = document.getElementById('recordCount');
const canEditHireDate = false;

function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function formatEmployeeName(record) {
  const surname = cleanText(record.surname).toUpperCase();
  const suffix = cleanText(record.suffix).toUpperCase();
  const firstName = cleanText(record.firstName).toUpperCase();
  const nameParts = [surname];
  if (suffix) nameParts.push(suffix);
  if (firstName) nameParts.push(firstName);
  return nameParts.filter(Boolean).join(' ');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return cleanText(value);
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function createDateCell(record) {
  const dateInput = document.createElement('input');
  dateInput.className = 'date-input';
  dateInput.type = 'date';
  dateInput.value = cleanText(record.dateHired);
  dateInput.disabled = !canEditHireDate;
  dateInput.setAttribute('aria-label', `Date hired for ${formatEmployeeName(record)}`);
  return dateInput;
}

function createLinkCell(record) {
  const directLink = document.createElement('a');
  directLink.className = 'direct-link';
  directLink.textContent = '201 Direct Link';
  directLink.target = '_blank';
  directLink.rel = 'noopener noreferrer';

  if (record.directLink) {
    directLink.href = record.directLink;
    directLink.innerHTML = '201 Direct Link <span aria-hidden="true">↗</span>';
  } else {
    directLink.classList.add('disabled');
    directLink.setAttribute('aria-disabled', 'true');
    directLink.tabIndex = -1;
    directLink.innerHTML = '201 Direct Link <span aria-hidden="true">—</span>';
  }

  return directLink;
}

function render() {
  const query = cleanText(searchInput.value).toUpperCase();
  const filtered = records.filter(record => formatEmployeeName(record).includes(query));
  tableBody.replaceChildren();
  recordCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;
  emptyState.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach(record => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const dateCell = document.createElement('td');
    const linkCell = document.createElement('td');

    nameCell.className = 'employee-name';
    nameCell.textContent = formatEmployeeName(record);
    dateCell.className = 'hired-date';
    dateCell.appendChild(createDateCell(record));
    linkCell.appendChild(createLinkCell(record));

    row.append(nameCell, dateCell, linkCell);
    tableBody.appendChild(row);
  });
}

async function initialize() {
  try {
    const response = await fetch(`${API_BASE}/api/201-files`, { credentials: 'include' });
    if (response.status === 401) {
      window.location.replace('login.html');
      return;
    }
    if (!response.ok) throw new Error('The 201 Files directory is unavailable.');
    records = await response.json();
    render();
  } catch (error) {
    recordCount.textContent = 'Unavailable';
    emptyState.querySelector('h2').textContent = 'Directory unavailable';
    emptyState.querySelector('p').textContent = error.message;
    emptyState.classList.remove('hidden');
  }
}

searchInput.addEventListener('input', render);
initialize();
