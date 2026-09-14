const UPSTREAM_URL = 'https://script.google.com/macros/s/AKfycbz2pEc6aCqKnzXIdiPQZBH6lc6X9TUZewPmS2RfuuSTh9UKSERrakfcH13OrlsrCcH9Zw/exec';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    }
  });
}

async function forwardToSheets(request) {
  const url = new URL(request.url);
  const upstream = new URL(UPSTREAM_URL);

  const forwardedHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length') continue;
    if (lower === 'origin') continue;
    forwardedHeaders.set(key, value);
  }

  const init = {
    method: request.method,
    headers: forwardedHeaders,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text()
  };

  const upstreamResponse = await fetch(UPSTREAM_URL + url.search, init);
  const raw = await upstreamResponse.text();

  const responseHeaders = {
    'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
    ...corsHeaders
  };

  return new Response(raw, {
    status: upstreamResponse.status,
    headers: responseHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === '/api/sheets' || url.pathname === '/api') {
      try {
        return await forwardToSheets(request);
      } catch (error) {
        return jsonResponse({ ok: false, error: error.message || 'Sheets proxy failed' }, 502);
      }
    }

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, status: 'ok', upstream: UPSTREAM_URL }, 200);
    }

    return jsonResponse({ ok: false, error: 'Not found' }, 404);
  }
};
