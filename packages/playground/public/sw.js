const cacheName = 'my-cache';

async function revalidate(event) {
  const client = await clients.get(event.clientId);
  client.postMessage({ type: 'cache' });
}

async function fetchAndCacheIfOk(cache, event) {
  try {
    const response = await fetch(event.request);

    if (response.ok) {
      await cache.put(event.request, response.clone());
    }

    return response;
  } catch (e) {
    console.error(e);

    return await cache.match('/index.html');
  }
}

async function fetchWithCache(event) {
  const cache = await caches.open(cacheName);
  const response = await cache.match(event.request);
  const result = fetchAndCacheIfOk(cache, event);
  if (!!response) {
    result.then(async (response2) => {
      const reader1 = response.body.getReader();
      const reader2 = response2.body.getReader();

      let i = 0;
      let j = 0;

      let oldChunk1 = null;
      let oldChunk2 = null;
      if (!oldChunk1) {
        oldChunk1 = await reader1.read();
      }
      if (!oldChunk2) {
        oldChunk2 = await reader2.read();
      }
      while (!oldChunk1.done && !oldChunk2.done) {
        if (oldChunk1.value[i] !== oldChunk2.value[j]) {
          revalidate(event);
          return;
        }
        i++;
        j++;
        if (i === oldChunk1.value.length) {
          oldChunk1 = await reader1.read();
          i = 0;
        }
        if (j === oldChunk2.value.length) {
          oldChunk2 = await reader2.read();
          j = 0;
        }
      }

      if (oldChunk1.done && oldChunk2.done) {
        return;
      } else {
        revalidate(event);
        return;
      }
    });

    return response.clone();
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
