import { createApp } from 'solid-utils';

import { App } from './app';
import { Store } from '../src';
import { registerServiceWorker } from './utils/serviceWorker';

createApp(App).use(Store).mount('#app');

registerServiceWorker();
