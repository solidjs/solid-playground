const cacheName = 'my-cache';

async function notifyClient(event) {
  const client = event.clientId ? await clients.get(event.clientId) : null;
  if (client) {
    client.postMessage({ type: 'cache' });
    return;
  }
  const all = await clients.matchAll();
  for (const c of all) c.postMessage({ type: 'cache' });
}

function responsesDiffer(cached, fresh) {
  const cachedTag = cached.headers.get('etag') || cached.headers.get('last-modified');
  const freshTag = fresh.headers.get('etag') || fresh.headers.get('last-modified');
  if (cachedTag && freshTag) return cachedTag !== freshTag;
  return false;
}

async function fetchAndCache(cache, event) {
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      await cache.put(event.request, response.clone());
    }
    return response;
  } catch (e) {
    console.error(e);
    if (event.request.mode === 'navigate') {
      return await cache.match('/index.html');
    }
    throw e;
  }
}

async function fetchWithCache(event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const fresh = fetchAndCache(cache, event);
  if (cached) {
    fresh.then((response) => {
      if (response && responsesDiffer(cached, response)) {
        notifyClient(event);
      }
    });
    return cached;
  }
  return fresh;
}

function handleFetch(event) {
  if (
    event.request.headers.get('cache-control') !== 'no-cache' &&
    event.request.method === 'GET' &&
    event.request.url.startsWith(self.location.origin)
  ) {
    event.respondWith(fetchWithCache(event));
  }
}

self.addEventListener('fetch', handleFetch);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== cacheName).map((k) => caches.delete(k)));
      await clients.claim();
    })(),
  );
});
