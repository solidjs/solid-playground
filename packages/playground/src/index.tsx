import { render } from 'solid-js/web';
import { App } from './app';
import { AppContextProvider } from './context';
import { registerServiceWorker } from './utils/serviceWorker';
import 'solid-devtools'
import 'virtual:uno.css';
import 'solid-repl/repl/main.css';

render(
  () => (
    <AppContextProvider>
      <App />
    </AppContextProvider>
  ),
  document.querySelector('#app')!,
);

registerServiceWorker();
