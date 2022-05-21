import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import { parseHash } from '../utils/parseHash';
import { isValidUrl } from '../utils/isValidUrl';

import CompilerWorker from '../../src/workers/compiler?worker';
import FormatterWorker from '../../src/workers/formatter?worker';
import { createTabList, defaultTabs, processImport, Tab } from '../../src';
import { createSignal, lazy, Suspense } from 'solid-js';

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

export const Edit = (props: { dark: boolean }) => {
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();

  const url = new URL(location.href);
  const initialTabs = parseHash<Tab[]>(url.hash && url.hash.slice(1)) || defaultTabs;

  const [tabs, setTabs] = createTabList(initialTabs);
  const [current, setCurrent] = createSignal('main.tsx');

  const params = Object.fromEntries(url.searchParams.entries());

  if (params.data && isValidUrl(params.data)) {
    fetch(params.data)
      .then((r) => r.json())
      .then((data) => setTabs(processImport(data)))
      .catch((e) => console.error('Failed to import browser data', e));
  }

  const isHorizontal = 'isHorizontal' in params;

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
        isHorizontal={isHorizontal}
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
