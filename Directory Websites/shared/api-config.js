(function () {
  const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbz2pEc6aCqKnzXIdiPQZBH6lc6X9TUZewPmS2RfuuSTh9UKSERrakfcH13OrlsrCcH9Zw/exec';
  const configuredUrl = (typeof window !== 'undefined' && (window.HR_PORTAL_API_URL || window.HR_PORTAL_SHEETS?.getApiUrl?.())) || DEFAULT_API_URL;

  window.HR_PORTAL_API_URL = configuredUrl;
  window.HR_PORTAL_SHEETS = window.HR_PORTAL_SHEETS || {};

  window.HR_PORTAL_SHEETS.getApiUrl = function getApiUrl() {
    return window.HR_PORTAL_API_URL || DEFAULT_API_URL;
  };

  window.HR_PORTAL_SHEETS.request = async function requestSheetsApi(options = {}) {
    const apiUrl = window.HR_PORTAL_SHEETS.getApiUrl();

    if (!/^https?:\/\//i.test(apiUrl)) {
      throw new Error('The Google Apps Script deployment URL is not configured.');
    }

    const response = await fetch(apiUrl, {
      ...options,
      cache: 'no-store',
      credentials: 'omit',
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
      throw new Error(`Invalid API response from Google Apps Script (${response.status}).`);
    }

    if (!response.ok || !result || result.ok === false) {
      throw new Error(result && result.error ? result.error : 'Google Sheets request failed');
    }

    return result;
  };

  window.HR_PORTAL_API_CONFIG = {
    appScriptUrl: configuredUrl,
    defaultHeaders: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  };
})();
