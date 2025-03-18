import { Show, JSX } from 'solid-js';
import { Route, Router } from '@solidjs/router';
import { eventBus, setEventBus } from './utils/serviceWorker';
import { Update } from './components/update';
import { useZoom } from 'solid-repl/src/hooks/useZoom';
import { Edit } from './pages/edit';
import { Home } from './pages/home';
import { Login } from './pages/login';

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
    <div class="dark:bg-darkerbg relative flex h-screen flex-col overflow-auto bg-lightbg font-sans text-slate-900 dark:text-slate-50">
      <Router>
        <Route path={['/:user/:repl', '/scratchpad']} component={Edit} />
        <Route path="/:user" component={Home} />
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
      </Router>
      <Show when={eventBus()} children={<Update onDismiss={() => setEventBus(false)} />} />
    </div>
  );
};
