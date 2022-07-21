// https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0#gistcomment-2800233
function uid(str) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://playground.solidjs.com',
  'Access-Control-Allow-Methods': 'GET,HEAD,PUT,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'PUT') {
      return handleCreateUrl(request, env);
    } else if (request.method === 'GET') {
      return handleRetrieveUrl(request, env);
    } else {
      return new Response('Unsupported method', { status: 401 });
    }
  },
};

async function handleCreateUrl(request, env) {
  const body = await request.json();

  // Bail early if URL is missing
  if (!body.url) {
    return new Response('Missing param URL', { status: 400 });
  }

  // Compute a hash based on the URL
  const id = uid(body.url);

  // Create it if it doesn't exist
  const value = await env.URLS.get(id);
  if (!value) await env.URLS.put(id, body.url);

  // And return it with proper headers
  const response = new Response(id, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  response.headers.append('Vary', 'Origin');

  return response;
}

async function handleRetrieveUrl(request, env) {
  const url = new URL(request.url);
  const hash = url.searchParams.get('hash');

  // If we don't have an hash then return the playground as is
  if (!hash) return env.ASSETS.fetch(request);

  // Attempt to retrieve the link associated with the hash
  // or fallback to the playground as is if not found
  const value = await env.URLS.get(hash);
  if (!value) return env.ASSETS.fetch(request);

  try {
    // Make sure the value is a valid URL and redirect to the associated URL
    const url = new URL(value);
    return Response.redirect(url.toString(), 301);
  } catch {
    return env.ASSETS.fetch(request);
  }
}
