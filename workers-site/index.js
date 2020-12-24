import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://playground.solidjs.com',
  'Access-Control-Allow-Methods': 'GET,HEAD,PUT,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// https://gist.github.com/gordonbrander/2230317#gistcomment-3443509
function uid() {
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return (
    Date.now().toString(36) +
    Array.from(a)
      .map((A) => A.toString(36))
      .join('')
  ).replace(/\./g, '');
}

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false;

addEventListener('fetch', (event) => {
  try {
    event.respondWith(handleEvent(event));

    if (event.request.method === 'OPTIONS') {
      // Handle CORS preflight requests
      event.respondWith(handleOptions(event.request));
    } else {
      event.respondWith(handleEvent(event));
    }
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      );
    }
    event.respondWith(new Response('Internal Error', { status: 500 }));
  }
});

function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const headers = request.headers;

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
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers'),
    };

    return new Response(null, { headers: respHeaders });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, PUT, OPTIONS',
      },
    });
  }
}

async function handleEvent(event) {
  const { request } = event;
  const url = new URL(request.url);
  let options = {};

  /**
   * You can add custom logic to how we fetch your assets
   * by configuring the function `mapRequestToAsset`
   */
  // options.mapRequestToAsset = handlePrefix(/^\/docs/)

  try {
    if (DEBUG) {
      // customize caching
      options.cacheControl = {
        bypassCache: true,
      };
    }

    if (request.method === 'PUT') {
      const body = await request.json();

      if (!body.url) {
        return new Response('Missing param URL', { status: 400 });
      }

      const id = uid();
      await URLS.put(id, body.url);

      const response = new Response(id, { status: 200 });
      response.headers.set('Access-Control-Allow-Origin', 'https://playground.solidjs.com');
      response.headers.append('Vary', 'Origin');

      return response;
    }

    const hash = url.searchParams.get('hash');

    if (hash) {
      const value = await URLS.get(hash);

      const defaultAssetKey = mapRequestToAsset(request);
      const url = new URL(value);

      return new Request(url.toString(), defaultAssetKey);
    }

    return await getAssetFromKV(event, options);
  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: (req) => new Request(`${new URL(req.url).origin}/404.html`, req),
        });

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
      } catch (e) {}
    }

    return new Response(e.message || e.toString(), { status: 500 });
  }
}

/**
 * Here's one example of how to modify a request to
 * remove a specific prefix, in this case `/docs` from
 * the url. This can be useful if you are deploying to a
 * route on a zone, or if you only want your static content
 * to exist at a specific path.
 */
function handlePrefix(prefix) {
  return (request) => {
    // compute the default (e.g. / -> index.html)
    let defaultAssetKey = mapRequestToAsset(request);
    let url = new URL(defaultAssetKey.url);

    // strip the prefix from the path for lookup
    url.pathname = url.pathname.replace(prefix, '/');

    // inherit all other props from the default request
    return new Request(url.toString(), defaultAssetKey);
  };
}
