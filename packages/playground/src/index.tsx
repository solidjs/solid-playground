import { render } from '@solidjs/web';
import { App } from './app';
import { registerServiceWorker } from './utils/serviceWorker';
import './styles.css';

render(() => <App />, document.querySelector('#app')!);

registerServiceWorker();
