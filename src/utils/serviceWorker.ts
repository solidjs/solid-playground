import { register } from 'register-service-worker';
import { eventBus } from './eventBus';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      register('/sw.js', {
        ready() {
          console.log('Service worker is active.');
        },
        registered() {
          console.log('✔ Application is now available offline');
        },
        cached() {
          console.log('Content has been cached for offline use.');
        },
        updatefound() {
          console.log('New content is downloading.');
        },
        updated(registration) {
          eventBus.emit('sw-update', registration);
          console.log('New content is available; please refresh.');
        },
      });
    });
  }
}
