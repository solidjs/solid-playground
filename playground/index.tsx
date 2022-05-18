import { Router } from 'solid-app-router';
import { render } from 'solid-js/web';
import { App } from './app';
import { registerServiceWorker } from './utils/serviceWorker';

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.querySelector('#app')!,
);

registerServiceWorker();
