import { Show, onCleanup, createEffect, createSignal, JSX } from 'solid-js';

import type { editor as mEditor } from 'monaco-editor';

import pkg from '../package.json';
import { eventBus } from './utils/eventBus';
import { createTabList, defaultTabs, processImport, Repl } from '../src';
import { Update } from './components/update';
import { Header } from './components/header';
import { parseHash } from './utils/parseHash';
import { isValidUrl } from './utils/isValidUrl';

import useZoom from '../src/hooks/useZoom';
import { isDarkTheme } from './utils/isDarkTheme';
import { exportToJSON } from './utils/exportFiles';

const createWorker = (path: string) => {
  return new Worker(
    new URL(path, import.meta.url), {type: 'module'}
  )
}

(window as any).MonacoEnvironment = {
  getWorker(_moduleId: unknown, label: string) {
    switch (label) {
      case 'css':
        return createWorker('monaco-editor/esm/vs/language/css/css.worker');
      case 'typescript':
      case 'javascript':
        return createWorker('monaco-editor/esm/vs/language/typescript/ts.worker');
      default:
        return createWorker('monaco-editor/esm/vs/editor/editor.worker');
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

  const compiler = createWorker('../src/workers/compiler');
  const formatter = createWorker('../src/workers/formatter');

  const url = new URL(location.href);
  const initialTabs = parseHash(url.hash && url.hash.slice(1), defaultTabs) || defaultTabs;
  const [tabs, setTabs] = createTabList(initialTabs);
  const [current, setCurrent] = createSignal('main.tsx');

  const params = Object.fromEntries(url.searchParams.entries());
  const [version, setVersion] = createSignal(params.version || pkg.dependencies['solid-js']);

  const [format, setFormat] = createSignal(false);
  let editor: mEditor.IStandaloneCodeEditor | undefined;

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

  if (params.format === 'json') {
    exportToJSON(tabs());
  }

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
    <div class="relative flex bg-solid-medium h-screen overflow-hidden text-slate-900 dark:text-slate-50 font-sans flex-col">
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
            formatCode={() => {
              if (!format()) {
                editor?.getAction('editor.action.formatDocument').run();
                editor?.focus();
              }
              setFormat(true);
              setTimeout(setFormat, 750, false);
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
        onEditorReady={(_editor) => {
          editor = _editor;
        }}
      />

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
