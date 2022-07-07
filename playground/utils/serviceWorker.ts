import { register } from 'register-service-worker';
import { createSignal } from 'solid-js';

const [eventBus, setEventBus] = createSignal();

function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      register('/sw.js', {
        updated(registration) {
          setEventBus(registration);
        },
      });
    });
  }
}

export { eventBus, registerServiceWorker };
