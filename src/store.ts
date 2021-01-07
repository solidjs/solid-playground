import { createStore } from 'solid-utils';
import { uid, parseHash } from './utils';
import { isValidUrl } from './utils/isValidUrl';
import { processImport } from './utils/processImport';

const defaultTabs: Tab[] = [
  {
    id: uid(),
    name: 'main',
    type: 'tsx',
    source:
      "import { render } from 'solid-js/web';\n" +
      "import { createSignal } from 'solid-js';\n" +
      '\n' +
      'function Counter() {\n' +
      '  const [count, setCount] = createSignal(0);\n' +
      '  const increment = () => setCount(count() + 1)\n' +
      '\n' +
      '  return (\n' +
      '    <button type="button" onClick={increment}>\n' +
      '      {count()}\n' +
      '    </button>\n' +
      '  );\n' +
      '}\n' +
      '\n' +
      "render(() => <Counter />, document.getElementById('app'))\n",
  },
];

export const compileMode = {
  SSR: { generate: 'ssr', hydratable: true },
  DOM: { generate: 'dom', hydratable: false },
  HYDRATABLE: { generate: 'dom', hydratable: true },
} as const;

type ValueOf<T> = T[keyof T];

const [Store, useStore] = createStore({
  state: async () => {
    const url = new URL(location.href);
    const initialTabs = url.hash && parseHash(url.hash.slice(1), defaultTabs);
    const params = Object.fromEntries(url.searchParams.entries());

    let tabs: Tab[] = initialTabs || defaultTabs;

    const [noHeader, noInteractive] = ['noHeader', 'noInteractive'].map((key) => key in params);

    if (params.data && isValidUrl(params.data)) {
      try {
        const data = await fetch(params.data).then((r) => r.json());
        tabs = processImport(data);
      } catch {}
    }

    // const dark = localStorage.getItem('dark');

    return {
      dark: false,
      current: tabs[0].id,
      currentCode: '',
      tabs,
      error: '',
      compiled: '',
      mode: 'DOM' as keyof typeof compileMode,
      header: !noHeader,
      interactive: !noInteractive,
      isCompiling: false,
      get compileMode(): ValueOf<typeof compileMode> {
        return compileMode[this.mode];
      },
    };
  },

  actions: (set, store) => ({
    resetError: () => set('error', ''),
    setCurrentTab: (current: string) => {
      set({ current });

      const idx = store.tabs.findIndex((tab) => tab.id === current);
      if (idx < 0) return;

      set({ currentCode: store.tabs[idx].source });
    },
    setTabName(id: string, name: string) {
      // FIXME: Use the below function, at the moment TS is not content
      // ref: https://github.com/ryansolid/solid/blob/master/documentation/store.md#setpath-changes
      // set("tabs", (tabs) => tabs.id === id, "name", name);

      const idx = store.tabs.findIndex((tab) => tab.id === id);
      if (idx < 0) return;

      set('tabs', idx, 'name', name);
    },
    removeTab(id: string) {
      const idx = store.tabs.findIndex((tab) => tab.id === id);
      const tab = store.tabs[idx];

      if (!tab) return;

      const confirmDeletion = confirm(`Are you sure you want to delete ${tab.name}.${tab.type}?`);
      if (!confirmDeletion) return;

      // We want to redirect to another tab if we are deleting the current one
      if (store.current === id) {
        set({
          current: store.tabs[idx - 1].id,
          currentCode: store.tabs[idx - 1].source,
        });
      }

      set('tabs', (tabs) => [...tabs.slice(0, idx), ...tabs.slice(idx + 1)]);
    },
    getCurrentSource() {
      const idx = store.tabs.findIndex((tab) => tab.id === store.current);
      if (idx < 0) return;

      return store.tabs[idx].source;
    },
    setCurrentSource(source: string) {
      const idx = store.tabs.findIndex((tab) => tab.id === store.current);
      if (idx < 0) return;

      set('tabs', idx, 'source', source);
    },
    addTab() {
      const nextId = uid();

      set({
        tabs: [
          ...store.tabs,
          {
            id: nextId,
            name: `tab${store.tabs.length}`,
            type: 'tsx',
            source: '',
          },
        ],
        current: nextId,
        currentCode: '',
      });
    },
  }),

  // effects: (set, get) => [
  //   () => {
  //     const action = get.dark ? 'add' : 'remove';
  //     document.body.classList[action]('dark');
  //     localStorage.setItem('dark', String(get.dark));
  //   }
  // ]
});

export { Store, useStore };

export interface Tab {
  id: string;
  name: string;
  type: string;
  source: string;
}

export type ReplTab = Pick<Tab, 'name' | 'source'>;
