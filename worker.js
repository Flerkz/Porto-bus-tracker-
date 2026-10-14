// Cloudflare Worker for the Porto buses page.
// STCP's stop, route and arrival-time data can't be read directly by a web page on another
// site, so this small helper fetches it and passes it on. It only forwards the read-only
// addresses listed below.
const ALLOWED = [
  /^\/stops$/, // every stop (name, code, position)
  /^\/stops\/[^/]{1,16}$/, // one stop
  /^\/stops\/[^/]{1,16}\/realtime$/, // buses due at one stop
  /^\/route\/[^/]{1,8}\/shape$/, // the path a line follows
  /^\/route\/[^/]{1,8}\/stops\/direction$/, // the stops of a line, in order
];
const CORS = { 'Access-Control-Allow-Origin': '*' };

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }
    if (!ALLOWED.some((re) => re.test(url.pathname))) {
      return new Response('Not found', { status: 404, headers: CORS });
    }
    let query = '';
    let maxAge = 15;
    if (url.pathname === '/stops') {
      query = '?limit=5000';
      maxAge = 86400;
    } else if (url.pathname.startsWith('/route/')) {
      query = '?direction_id=' + (url.searchParams.get('direction_id') === '1' ? '1' : '0');
      maxAge = 86400;
    }
    try {
      const res = await fetch('https://stcp.pt/api' + url.pathname + query, {
        headers: { Accept: 'application/json' },
      });
      return new Response(res.body, {
        status: res.status,
        headers: {
          ...CORS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=' + maxAge,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'STCP did not answer' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  },
};
