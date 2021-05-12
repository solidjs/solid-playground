import { compressToURL as encode } from '@amoutonbrady/lz-string';

import { lazy, Show, onCleanup, Component, createEffect, createSignal } from 'solid-js';
import { eventBus } from './utils/eventBus';
import { useStore } from '../src';
import { Repl } from '../src';
import { Update } from './components/update';
import { Header } from './components/header';

import CompilerWorker from '../src/workers/compiler?worker';
import FormatterWorker from '../src/workers/formatter?worker';
const Editor = lazy(() => import('../src/components/editor'));

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
(window as any).MonacoEnvironment = {
  getWorker: function (moduleId, label: string) {
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

  const [store, actions] = useStore();

  /**
   * This syncs the URL hash with the state of the current tab.
   * This is an optimized encoding for limiting URL size...
   *
   * TODO: Find a way to URL shorten this
   */
  createEffect(() => {
    location.hash = encode(JSON.stringify(store.tabs));
  });

  const dark = localStorage.getItem('dark');
  actions.set('dark', dark === 'true');

  createEffect(() => {
    const action = store.dark ? 'add' : 'remove';
    document.body.classList[action]('dark');
    localStorage.setItem('dark', String(store.dark));
  });

  return (
    <div class="relative grid bg-blueGray-50 h-screen overflow-hidden text-blueGray-900 dark:text-blueGray-50 font-display grid-cols-1">
      <Show
        when={store.header}
        children={<Header />}
        fallback={<div classList={{ 'md:col-span-2': !store.isHorizontal }}></div>}
      />

      <Repl compiler={compiler} formatter={formatter} editor={Editor} />

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
