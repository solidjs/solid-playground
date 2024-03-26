import { render } from 'solid-js/web';
import { App } from './app';
import { registerServiceWorker } from './utils/serviceWorker';
import 'solid-repl/repl/main.css';
import 'virtual:uno.css';

render(() => <App />, document.querySelector('#app')!);

registerServiceWorker();
