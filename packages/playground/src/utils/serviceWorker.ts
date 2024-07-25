import { register } from 'register-service-worker';
import { createSignal } from 'solid-js';

const [eventBus, setEventBus] = createSignal();

function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      register('/sw.js', {
        updated() {
          setEventBus(true);
        },
      });
    });
  }
}

navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data.type == 'cache') {
    setEventBus(true);
  }
});

export { eventBus, setEventBus, registerServiceWorker };
