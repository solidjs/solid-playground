import { render } from 'solid-js/web';
import { App } from './app';
import { registerServiceWorker } from './utils/serviceWorker';
import 'virtual:uno.css';
import 'solid-repl/repl/main.css';

render(() => <App />, document.querySelector('#app')!);

registerServiceWorker();
