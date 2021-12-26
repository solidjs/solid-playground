import { compressToURL as encode } from '@amoutonbrady/lz-string';
import { Show, onCleanup, createEffect, createSignal, JSX } from 'solid-js';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';

import pkg from '../package.json';
import { eventBus } from './utils/eventBus';
import { createTabList, defaultTabs, processImport, Repl } from '../src';
import { Update } from './components/update';
import { Header } from './components/header';
import { parseHash } from './utils/parseHash';
import { isValidUrl } from './utils/isValidUrl';

import CompilerWorker from '../src/workers/compiler?worker';
import FormatterWorker from '../src/workers/formatter?worker';
import useZoom from '../src/hooks/useZoom';
import { isDarkTheme } from './utils/isDarkTheme';

(window as any).MonacoEnvironment = {
  getWorker(_moduleId: unknown, label: string) {
    switch (label) {
      case 'css':
        return new cssWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

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

  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();

  const url = new URL(location.href);
  const initialTabs = parseHash(url.hash && url.hash.slice(1), defaultTabs) || defaultTabs;
  const [tabs, setTabs] = createTabList(initialTabs);
  const [current, setCurrent] = createSignal('main.tsx');

  const params = Object.fromEntries(url.searchParams.entries());
  const [version, setVersion] = createSignal(params.version || pkg.dependencies['solid-js']);

  /**
   * This syncs the URL hash with the state of the current tab.
   * This is an optimized encoding for limiting URL size...
   */
  createEffect(() => {
    const url = new URL(location.href);
    url.hash = encode(JSON.stringify(tabs()));
    url.searchParams.set('version', version());
    history.replaceState({}, '', url.toString());
  });

  if (params.data && isValidUrl(params.data)) {
    fetch(params.data)
      .then((r) => r.json())
      .then((data) => {
        setTabs(processImport(data));
      })
      .catch((e) => console.error('Failed to import browser data', e));
  }

  const [noHeader, noInteractive, isHorizontal, noEditableTabs] = [
    'noHeader',
    'noInteractive',
    'isHorizontal',
    'noEditableTabs',
  ].map((key) => key in params);

  const [dark, setDark] = createSignal(isDarkTheme());

  createEffect(() => {
    const action = dark() ? 'add' : 'remove';
    document.body.classList[action]('dark');
  });

  const header = !noHeader;
  const interactive = !noInteractive;
  const editableTabs = !noEditableTabs;

  const { zoomState, updateZoomScale } = useZoom();

  document.addEventListener('keydown', (e) => {
    const key = e.key;

    if (!zoomState.overrideNative) return;

    if (!((e.ctrlKey || e.metaKey) && (key === '=' || key === '-'))) {
      return;
    }

    e.preventDefault();

    if (key === '=') {
      updateZoomScale('increase');
    } else {
      updateZoomScale('decrease');
    }
  });

  return (
    <div class="relative flex bg-blueGray-50 h-screen overflow-hidden text-blueGray-900 dark:text-blueGray-50 font-sans flex-col">
      <Show
        when={header}
        children={
          <Header
            dark={dark()}
            toggleDark={() => {
              const toggledValue = !dark();
              setDark(toggledValue);
              localStorage.setItem('dark', String(toggledValue));
            }}
            isHorizontal={isHorizontal}
            tabs={tabs()}
            setTabs={setTabs}
            setCurrent={setCurrent}
            onVersionChange={setVersion}
            version={version()}
          />
        }
        fallback={<div classList={{ 'md:col-span-2': !isHorizontal }}></div>}
      />

      <Repl
        compiler={compiler}
        formatter={formatter}
        isHorizontal={isHorizontal}
        interactive={interactive}
        editableTabs={editableTabs}
        dark={dark()}
        tabs={tabs()}
        setTabs={setTabs}
        current={current()}
        setCurrent={setCurrent}
        version={version()}
        id="repl"
      />

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
