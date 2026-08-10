import { Show, JSX, Suspense } from 'solid-js';
import { Route, Router } from '@solidjs/router';
import { eventBus, setEventBus } from './utils/serviceWorker';
import { Update } from './components/update';
import { useZoom } from 'solid-repl/src/hooks/useZoom';
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

export const App = (): JSX.Element => {
  const { zoomState, updateZoom } = useZoom();
  document.addEventListener('keydown', (e) => {
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
      <Router
        root={(props) => (
          <AppContextProvider>
            <Suspense>{props.children}</Suspense>
          </AppContextProvider>
        )}
      >
        <Route path={['/', '/:user/:repl']} component={Edit} />
        <Route path="/:user" component={Home} />
        <Route path="/login" component={Login} />
      </Router>

      <Show when={eventBus()} children={<Update onDismiss={() => setEventBus(false)} />} />
    </div>
  );
};
