import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import { parseHash } from './utils/parseHash';
import { isValidUrl } from './utils/isValidUrl';

import CompilerWorker from '../src/workers/compiler?worker';
import FormatterWorker from '../src/workers/formatter?worker';
import { exportToJSON } from './utils/exportFiles';
import { createTabList, defaultTabs, processImport, Repl, Tab } from '../src';
import { createSignal } from 'solid-js';

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

  if (params.format === 'json') {
    exportToJSON(tabs());
  }

  return (
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
  );
};
