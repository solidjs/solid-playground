import { register } from 'register-service-worker';
import { createSignal } from 'solid-js';

const [updateAvailable, setUpdateAvailable] = createSignal(false);

function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      register('/sw.js', {
        updated() {
          setUpdateAvailable(true);
        },
      });
    });
  }
}

if (import.meta.env.PROD) {
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data.type == 'cache') {
      setUpdateAvailable(true);
    }
  });
}

export { updateAvailable, setUpdateAvailable, registerServiceWorker };
