import { Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import { App } from './app';
import { AppContextProvider } from './context';
import { registerServiceWorker } from './utils/serviceWorker';

render(
  () => (
    <Router>
      <AppContextProvider>
        <App />
      </AppContextProvider>
    </Router>
  ),
  document.querySelector('#app')!,
);

registerServiceWorker();
