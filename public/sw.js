const cacheName = 'my-cache';

async function fetchAndCacheIfOk(event, stale) {
  try {
    const response = await fetch(event.request);

    if (response.ok) {
      const responseClone = response.clone();
      const cache = await caches.open(cacheName);
      await cache.put(event.request, responseClone);
      if (stale) self.postMessage({ type: 'cache' });
    }

    return response;
  } catch (e) {
    const cache = await caches.open(cacheName);
    return await cache.match('/index.html');
  }
}

async function fetchWithCache(event) {
  const cache = await caches.open(cacheName);
  const response = await cache.match(event.request);
  const result = fetchAndCacheIfOk(event, !!response);
  if (!!response) {
    return response;
  } else {
    return result;
  }
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
