import type { Tab } from './types';

export type { EditorPersistedState, Repl, ReplProps, ReplStorage, Tab } from './types';

export {
  DEFAULT_SOLID_VERSION,
  IMPORT_MAP_FILE,
  isSolidV2,
  parseImportMap,
  solidVersionFromImportMap,
} from './kernel/importMap';
export { batched } from './kernel/batched';

const indexTSX = `import { render } from "@solidjs/web";
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
