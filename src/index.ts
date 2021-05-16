import './assets/tailwind.css';
import { uid } from './utils/uid';

export { Repl } from './components/repl';
export { processImport } from './utils/processImport';

export interface Tab {
  id: string;
  name: string;
  type: string;
  source: string;
}

export const defaultTabs: Tab[] = [
  {
    id: uid(),
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
