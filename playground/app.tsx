import { Show, createSignal, JSX, on } from 'solid-js';
import { Routes, Route, useSearchParams } from 'solid-app-router';
import { eventBus } from './utils/serviceWorker';
import { Update } from './components/update';
import { Header } from './components/header';
import { useZoom } from '../src/hooks/useZoom';
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
  const [newUpdate, setNewUpdate] = createSignal(eventBus() != undefined);
  on(eventBus, () => setNewUpdate(true));

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
    <div class="relative flex bg-white dark:bg-solid-darkbg dark:text-white text-black h-screen text-slate-900 dark:text-slate-50 font-sans flex-col overflow-auto">
      <Header
        dark={dark()}
        toggleDark={() => {
          const toggledValue = !dark();
          setDark(toggledValue);
          localStorage.setItem('dark', String(toggledValue));
        }}
      />

      <Routes>
        <Route
          path="/:user/:repl"
          element={<Edit dark={dark()} horizontal={searchParams.isHorizontal != undefined} />}
        />
        <Route path="/:user" element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
