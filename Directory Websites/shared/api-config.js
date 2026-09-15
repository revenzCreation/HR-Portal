(function () {
  const DEFAULT_SAME_ORIGIN_PATH = '/api/sheets';
  const DEFAULT_UPSTREAM_URL = 'https://script.google.com/macros/s/AKfycbzw10235KTU6EvGNRVtBazNQayZrBLWh5UwIWl7wsJjykh4X1dfifZcr57no_d3tN5-qw/exec';
  const configuredUrl = DEFAULT_UPSTREAM_URL;

  window.HR_PORTAL_API_URL = configuredUrl;
  window.HR_PORTAL_SHEETS = window.HR_PORTAL_SHEETS || {};

  window.HR_PORTAL_SHEETS.getApiUrl = function getApiUrl() {
    return window.HR_PORTAL_API_URL || DEFAULT_UPSTREAM_URL;
  };

  window.HR_PORTAL_SHEETS.request = async function requestSheetsApi(options = {}) {
    const apiUrl = window.HR_PORTAL_SHEETS.getApiUrl();

    if (!apiUrl || !/^\/?[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$/i.test(apiUrl)) {
      throw new Error('The Sheets API URL is not configured.');
    }

    const response = await fetch(apiUrl, {
      ...options,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        ...(options.headers || {})
      }
    });

    const rawText = await response.text();
    let result = {};

    try {
      result = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      throw new Error(`Invalid API response from the Sheets API (${response.status}). URL: ${apiUrl}`);
    }

    if (!response.ok || !result || result.ok === false) {
      throw new Error(result && result.error ? result.error : `Google Sheets request failed. URL: ${apiUrl}`);
    }

    return result;
  };

  window.HR_PORTAL_API_CONFIG = {
    appScriptUrl: configuredUrl,
    defaultHeaders: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    defaultUpstreamUrl: DEFAULT_UPSTREAM_URL
  };
})();
