(function () {
  const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbz2pEc6aCqKnzXIdiPQZBH6lc6X9TUZewPmS2RfuuSTh9UKSERrakfcH13OrlsrCcH9Zw/exec';
  const configuredUrl = (typeof window !== 'undefined' && (window.HR_PORTAL_API_URL || window.HR_PORTAL_SHEETS?.getApiUrl?.())) || DEFAULT_API_URL;

  window.HR_PORTAL_API_URL = configuredUrl;
  window.HR_PORTAL_SHEETS = window.HR_PORTAL_SHEETS || {};
  window.HR_PORTAL_SHEETS.getApiUrl = function getApiUrl() {
    return window.HR_PORTAL_API_URL || DEFAULT_API_URL;
  };
  window.HR_PORTAL_API_CONFIG = {
    appScriptUrl: configuredUrl,
    defaultHeaders: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  };
})();
