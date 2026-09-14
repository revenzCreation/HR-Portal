window.HR_PORTAL_API_URL = window.HR_PORTAL_API_URL || '/api/sheets';
window.HR_PORTAL_SHEETS = window.HR_PORTAL_SHEETS || {};

window.HR_PORTAL_SHEETS.getApiUrl = function getApiUrl() {
  return window.HR_PORTAL_API_URL || '/api/sheets';
};

window.HR_PORTAL_SHEETS.request = async function requestSheetsApi(options = {}) {
  const apiUrl = window.HR_PORTAL_SHEETS.getApiUrl();
  const response = await fetch(apiUrl, {
    ...options,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {})
    }
  });

  const rawText = await response.text();
  let result = {};
  try {
    result = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    throw new Error(`Invalid API response from Sheets API (${response.status}).`);
  }

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || 'Google Sheets request failed.');
  }

  return result;
};
