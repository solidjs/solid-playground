import { Errored, Loading, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { createRouter } from '@solidjs/router';
import { makeEventListener } from '@solid-primitives/event-listener';
import { updateAvailable, setUpdateAvailable } from './utils/serviceWorker';
import { Update } from './components/update';
import { useZoom } from 'solid-repl/src/internal';
import { Edit } from './pages/edit';
import { Home } from './pages/home';
import { Login } from './pages/login';
import { AppContextProvider } from './context';
import { css } from 'styled-system/css';

const shell = css({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  h: '100dvh',
  overflow: 'auto',
  fontFamily: 'sans',
  color: 'neutral.900',
  bg: 'neutral.100',
  _dark: { color: 'neutral.50', bg: 'neutral.950' },
});

const errorPanel = css({ m: 'auto', p: 6, textAlign: 'center', fontSize: 'sm' });
const retryButton = css({
  mt: 3,
  px: 3,
  py: 1.5,
  rounded: 'md',
  bg: 'solidc',
  color: 'white',
  _hover: { bg: 'solidc/90' },
});

const Router = createRouter({
  routes: [
    { path: ['/', '/:user/:repl'], component: Edit },
    { path: '/login', component: Login },
    { path: '/:user', component: Home },
  ],
});

export const App = (): JSX.Element => {
  const { zoomState, updateZoom } = useZoom();
  makeEventListener(document, 'keydown', (e) => {
    if (!zoomState.overrideNative) return;
    if (!(e.ctrlKey || e.metaKey)) return;

    if (e.key === '=') {
      updateZoom('increase');
      e.preventDefault();
    } else if (e.key == '-') {
      updateZoom('decrease');
      e.preventDefault();
    }
  });

  return (
    <div class={shell}>
      <Router>
        {(props) => (
          <AppContextProvider>
            <Errored
              fallback={(err, reset) => (
                <div class={errorPanel}>
                  <p>Something went wrong: {String(err())}</p>
                  <button class={retryButton} onClick={() => reset()}>
                    Retry
                  </button>
                </div>
              )}
            >
              <Loading>{props.children}</Loading>
            </Errored>
          </AppContextProvider>
        )}
      </Router>

      <Show when={updateAvailable()}>
        <Update onDismiss={() => setUpdateAvailable(false)} />
      </Show>
    </div>
  );
};
