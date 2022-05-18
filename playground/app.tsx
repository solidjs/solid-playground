import { Show, onCleanup, createEffect, createSignal, JSX } from 'solid-js';

import { Routes, Route } from 'solid-app-router';
import { eventBus } from './utils/eventBus';

import { Update } from './components/update';
import { Header } from './components/header';

import { useZoom } from '../src/hooks/useZoom';
import { isDarkTheme } from './utils/isDarkTheme';
import { Edit } from './edit';
import { Home } from './home';

let swUpdatedBeforeRender = false;
eventBus.on('sw-update', () => (swUpdatedBeforeRender = true));

export const App = (): JSX.Element => {
  /**
   * Those next three lines are useful to display a popup
   * if the client code has been updated. This trigger a signal
   * via an EventBus initiated in the service worker and
   * the couple line above.
   */
  const [newUpdate, setNewUpdate] = createSignal(swUpdatedBeforeRender);
  eventBus.on('sw-update', () => setNewUpdate(true));
  onCleanup(() => eventBus.all.clear());

  const [dark, setDark] = createSignal(isDarkTheme());
  createEffect(() => document.body.classList.toggle('dark', dark()));

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
    <div class="relative flex bg-white dark:bg-solid-darkbg dark:text-white text-black h-screen overflow-hidden text-slate-900 dark:text-slate-50 font-sans flex-col">
      <Header
        dark={dark()}
        toggleDark={() => {
          const toggledValue = !dark();
          setDark(toggledValue);
          localStorage.setItem('dark', String(toggledValue));
        }}
        tabs={[]}
      />

      <Routes>
        <Route path="/:user/:repl" element={<Edit dark={dark()} />} />
        <Route path="/:id" element={<Home />} />
        <Route path="/" element={<Home />} />
      </Routes>

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
