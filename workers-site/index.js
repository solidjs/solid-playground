import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

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

addEventListener('fetch', (event) => {
  try {
    if (event.request.method === 'OPTIONS') {
      event.respondWith(handleOptions(event));
    } else {
      event.respondWith(handleEvent(event));
    }
  } catch {
    event.respondWith(new Response('Internal Error', { status: 500 }));
  }
});

async function handleEvent(event) {
  try {
    if (event.request.method === 'PUT') return handleCreateUrl(event.request);
    else if (event.request.method === 'GET') return handleRetrieveUrl(event);
    else return new Response('Unsupported method', { status: 401 });
  } catch (e) {
    return new Response(e.message || e.toString(), { status: 500 });
  }
}

function handleOptions({ request: { headers } }) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.
    const respHeaders = {
      ...corsHeaders,
      // Allow all future content Request headers to go back to browser
      // such as Authorization (Bearer) or X-Client-Name-Version
      'Access-Control-Allow-Headers': headers.get('Access-Control-Request-Headers'),
    };

    return new Response(null, { headers: respHeaders });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: { Allow: 'GET, HEAD, PUT, OPTIONS' },
    });
  }
}

async function handleCreateUrl(request) {
  const body = await request.json();

  // Bail early if URL is missing
  if (!body.url) {
    return new Response('Missing param URL', { status: 400 });
  }

  // Compute a hash based on the URL
  const id = uid(body.url);

  // Create it if it doesn't exist
  const value = await URLS.get(id);
  if (!value) await URLS.put(id, body.url);

  // And return it with proper headers
  const response = new Response(id, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', corsHeaders['ccess-Control-Allow-Origin']);
  response.headers.append('Vary', 'Origin');

  return response;
}

async function handleRetrieveUrl(event) {
  const url = new URL(event.request.url);
  const hash = url.searchParams.get('hash');

  // If we don't have an hash then return the playground as is
  if (!hash) return await getAssetFromKV(event, {});

  // Attempt to retrieve the link associated with the hash
  // or fallback to the playground as is if not found
  const value = await URLS.get(hash);
  if (!value) return await getAssetFromKV(event, {});

  try {
    // Make sure the value is a valid URL and redirect to the associated URL
    const url = new URL(value);
    return Response.redirect(url.toString(), 301);
  } catch {
    return await getAssetFromKV(event, {});
  }
}
