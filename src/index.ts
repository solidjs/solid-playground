import './assets/tailwind.css';
import { createApp } from 'solid-utils';

import { App } from './app';
import { Store } from './store';
import { registerServiceWorker } from './utils';

const app = createApp(App);
app.use(Store);
app.mount('#app');

registerServiceWorker();
