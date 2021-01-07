import { register } from 'register-service-worker';
import { eventBus } from './eventBus';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      register('/sw.js', {
        updated(registration) {
          eventBus.emit('sw-update', registration);
        },
      });
    });
  }
}
