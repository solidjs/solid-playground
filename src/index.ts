import './assets/tailwind.css';
import { createApp } from 'solid-utils';

import { App } from './app';
import { Store } from './store';
import { registerServiceWorker } from './utils';

createApp(App).use(Store).mount('#app');

registerServiceWorker();
