import type { Tab } from 'solid-repl';

export { IMPORT_MAP_FILE, isSolidV2, parseImportMap, solidVersionFromImportMap } from './kernel/importMap';

const indexTSX = `import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);

  return (
    <button type="button" onClick={increment}>
      {count()}
    </button>
  );
}

render(() => <Counter />, document.getElementById("app")!);
`;

export const defaultTabs: Tab[] = [
  {
    name: 'main.tsx',
    source: indexTSX,
  },
];
