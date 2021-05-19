import { compressToURL as encode } from '@amoutonbrady/lz-string';

import { Show, onCleanup, Component, createEffect, createSignal, onMount } from 'solid-js';
import { eventBus } from './utils/eventBus';
import { createTabList, defaultTabs, processImport, Repl } from '../src';
import { Update } from './components/update';
import { Header } from './components/header';
import { parseHash } from './utils/parseHash';
import { isValidUrl } from './utils/isValidUrl';

import CompilerWorker from '../src/workers/compiler?worker';
import FormatterWorker from '../src/workers/formatter?worker';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';

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

export const App: Component = () => {
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

  /**
   * This syncs the URL hash with the state of the current tab.
   * This is an optimized encoding for limiting URL size...
   *
   * TODO: Find a way to URL shorten this
   */
  createEffect(() => {
    location.hash = encode(JSON.stringify(tabs()));
  });

  const params = Object.fromEntries(url.searchParams.entries());

  onMount(async () => {
    if (params.data && isValidUrl(params.data)) {
      try {
        const data = await fetch(params.data).then((r) => r.json());
        setTabs(processImport(data));
      } catch {}
    }
  });

  const [noHeader, noInteractive, isHorizontal, noActionBar, noEditableTabs] = [
    'noHeader',
    'noInteractive',
    'isHorizontal',
    'noActionBar',
    'noEditableTabs',
  ].map((key) => key in params);

  const [dark, setDark] = createSignal(localStorage.getItem('dark') === 'true');

  createEffect(() => {
    const action = dark() ? 'add' : 'remove';
    document.body.classList[action]('dark');
    localStorage.setItem('dark', String(dark()));
  });

  const header = !noHeader;
  const interactive = !noInteractive;
  const actionBar = !noActionBar;
  const editableTabs = !noEditableTabs;

  return (
    <div class="relative flex bg-blueGray-50 h-screen overflow-hidden text-blueGray-900 dark:text-blueGray-50 font-display flex-col">
      <Show
        when={header}
        children={
          <Header
            dark={dark()}
            toggleDark={() => setDark(!dark())}
            isHorizontal={isHorizontal}
            tabs={tabs()}
            setTabs={setTabs}
            setCurrent={setCurrent}
          />
        }
        fallback={<div classList={{ 'md:col-span-2': !isHorizontal }}></div>}
      />

      <Repl
        compiler={compiler}
        formatter={formatter}
        isHorizontal={isHorizontal}
        interactive={interactive}
        actionBar={actionBar}
        editableTabs={editableTabs}
        dark={dark()}
        tabs={tabs()}
        setTabs={setTabs}
        current={current()}
        setCurrent={setCurrent}
      />

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
