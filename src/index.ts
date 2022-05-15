import './assets/main.css';
import 'virtual:windi.css';

export { Repl } from './components/repl';
export { processImport } from './utils/processImport';
export { createTabList } from './utils/createTabList';
import type { Tab } from '../types/types';
export type { Tab };

export const defaultTabs: Tab[] = [
  {
    name: 'main',
    type: 'tsx',
    source:
      'import { render } from "solid-js/web";\n' +
      'import { createSignal } from "solid-js";\n' +
      '\n' +
      'function Counter() {\n' +
      '  const [count, setCount] = createSignal(0);\n' +
      '  const increment = () => setCount(count() + 1);\n' +
      '\n' +
      '  return (\n' +
      '    <button type="button" onClick={increment}>\n' +
      '      {count()}\n' +
      '    </button>\n' +
      '  );\n' +
      '}\n' +
      '\n' +
      'render(() => <Counter />, document.getElementById("app"));\n',
  },
];
