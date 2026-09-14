export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      }
    });
  }

  const upstreamUrl = env.UPSTREAM_URL || 'https://script.google.com/macros/s/AKfycbz2pEc6aCqKnzXIdiPQZBH6lc6X9TUZewPmS2RfuuSTh9UKSERrakfcH13OrlsrCcH9Zw/exec';

  try {
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      const lower = key.toLowerCase();
      if (lower === 'host' || lower === 'content-length' || lower === 'origin') continue;
      headers.set(key, value);
    }

    const init = {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text()
    };

    const response = await fetch(`${upstreamUrl}${url.search}`, init);
    const raw = await response.text();

    return new Response(raw, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      }
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message || 'Sheets proxy failed' },
      { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
