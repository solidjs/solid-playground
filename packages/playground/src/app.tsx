import { Show, JSX } from 'solid-js';
import { Routes, Route, useSearchParams } from '@solidjs/router';
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

  const [searchParams] = useSearchParams();

  return (
    <div class="dark:bg-solid-darkbg relative flex h-screen flex-col overflow-auto bg-white font-sans text-slate-900 dark:text-slate-50">
      <Routes>
        <Route
          path={['/:user/:repl', '/scratchpad']}
          element={<Edit horizontal={searchParams.isHorizontal != undefined} />}
        />
        <Route path="/:user" element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>

      <Show when={eventBus()} children={<Update onDismiss={() => setEventBus(false)} />} />
    </div>
  );
};
