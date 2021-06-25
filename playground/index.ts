import { render } from 'solid-js/web';
import { App } from './app';
import { registerServiceWorker } from './utils/serviceWorker';

render(App, document.querySelector('#app')!);

registerServiceWorker();
