import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import CompilerWorker from '../../src/workers/compiler?worker';
import FormatterWorker from '../../src/workers/formatter?worker';
import { createTabList } from '../../src';
import { createEffect, createResource, createSignal, lazy, Suspense } from 'solid-js';
import { useParams } from 'solid-app-router';
import { API, useAppContext } from '../context';
import createDebounce from '@solid-primitives/debounce';
import type { APIRepl } from './home';

const Repl = lazy(() => import('../../src/components/repl'));

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

export const Edit = (props: { dark: boolean; horizontal: boolean }) => {
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();

  const params = useParams();
  const context = useAppContext()!;
  const [fetchedTabs] = createResource<APIRepl, string>(params.repl, (repl) =>
    fetch(`${API}/repl/${repl}`).then((r) => r.json()),
  );

  const [tabs, setTabs] = createTabList([]);
  const [current, setCurrent] = createSignal<string>();
  createEffect(() => {
    const myRepl = fetchedTabs();
    if (!myRepl) return;
    setTabs(
      myRepl.files.map((x) => {
        let dot = x.name.lastIndexOf('.');
        return { name: x.name.slice(0, dot), type: x.name.slice(dot + 1), source: x.content.join('\n') };
      }),
    );
    setCurrent(myRepl.files[0].name);
  });

  const tabMapper = () => tabs().map((x) => ({ name: `${x.name}.${x.type}`, content: x.source.split('\n') }));
  const updateRepl = createDebounce(() => {
    const repl = fetchedTabs();
    const tabs = tabMapper();
    if (!repl || !tabs.length) return;
    fetch(`${API}/repl/${repl.id}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${context.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: repl.title,
        version: repl.version,
        public: repl.public,
        labels: repl.labels,
        files: tabs,
      }),
    });
  }, 1000);
  createEffect(() => {
    tabMapper();
    updateRepl();
  });

  return (
    <Suspense
      fallback={
        <svg
          class="animate-spin h-12 w-12 text-white m-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      }
    >
      <Repl
        compiler={compiler}
        formatter={formatter}
        isHorizontal={props.horizontal}
        dark={props.dark}
        tabs={tabs()}
        setTabs={setTabs}
        current={current()}
        setCurrent={setCurrent}
        id="repl"
      />
    </Suspense>
  );
};
