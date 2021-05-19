import { createApp } from 'solid-utils';

import { App } from './app';
import { registerServiceWorker } from './utils/serviceWorker';

createApp(App).mount('#app');

registerServiceWorker();
