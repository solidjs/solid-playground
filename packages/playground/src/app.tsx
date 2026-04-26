import { Show, JSX, Suspense } from 'solid-js';
import { Route, Router } from '@solidjs/router';
import { eventBus, setEventBus } from './utils/serviceWorker';
import { Update } from './components/update';
import { useZoom } from 'solid-repl/src/hooks/useZoom';
import { Edit } from './pages/edit';
import { Home } from './pages/home';
import { Login } from './pages/login';
import { AppContextProvider } from './context';

export const App = (): JSX.Element => {
  /**
   * Those next three lines are useful to display a popup
   * if the client code has been updated. This trigger a signal
   * via an EventBus initiated in the service worker and
   * the couple line above.
   */
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
    <div class="text-neutral-900 dark:text-neutral-50 bg-neutral-100 dark:bg-neutral-950 relative flex h-screen flex-col overflow-auto font-sans">
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
