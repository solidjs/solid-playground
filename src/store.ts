import { createStore } from 'solid-utils';
import { uid, parseHash } from './utils';
import { isValidUrl } from './utils/isValidUrl';
import { processImport } from './utils/processImport';
import { Uri, editor } from 'monaco-editor';
const setupEditor = import('./components/editor/setupSolid');

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

    const [noHeader, noInteractive, isHorizontal, noActionBar, noEditableTabs] = [
      'noHeader',
      'noInteractive',
      'isHorizontal',
      'noActionBar',
      'noEditableTabs',
    ].map((key) => key in params);

    if (params.data && isValidUrl(params.data)) {
      try {
        const data = await fetch(params.data).then((r) => r.json());
        tabs = processImport(data);
      } catch {}
    }

    await setupEditor.then(() => {
      const fileUri = Uri.parse(`file:///output_dont_import.tsx`);
      editor.createModel('', 'typescript', fileUri);

      for (const tab of tabs) {
        const fileUri = Uri.parse(`file:///${tab.name}.${tab.type}`);
        editor.createModel(tab.source, tab.type === 'tsx' ? 'typescript' : 'css', fileUri);
      }
    });

    return {
      dark: undefined as boolean,
      current: tabs[0].id,
      get currentTab(): Tab {
        return this.tabs.find((tab) => tab.id === this.current);
      },
      tabs,
      error: '',
      compiled: '',
      mode: 'DOM' as keyof typeof compileMode,
      header: !noHeader,
      interactive: !noInteractive,
			isHorizontal: !!isHorizontal, 
			noActionBar: !noActionBar, 
			noEditableTabs: !!noEditableTabs,
      isCompiling: false,
      get compileMode(): ValueOf<typeof compileMode> {
        return compileMode[this.mode];
      },
    };
  },

  actions: (set, store) => ({
    resetError: () => set('error', ''),
    setCurrentTab: (current: string) => {
      const idx = store.tabs.findIndex((tab) => tab.id === current);
      if (idx < 0) return;
      set({ current: current });
    },
    setCompiled(compiled: string) {
      editor
        .getModel(Uri.parse(`file:///output_dont_import.tsx`))
        .setValue(compiled.replace(/(https:\/\/cdn.skypack.dev\/)|(@[0-9.]+)/g, ''));
      set({ compiled, isCompiling: false });
    },
    setTabName(id: string, name: string) {
      // FIXME: Use the below function, at the moment TS is not content
      // ref: https://github.com/ryansolid/solid/blob/master/documentation/store.md#setpath-changes
      // set("tabs", (tabs) => tabs.id === id, "name", name);

      const idx = store.tabs.findIndex((tab) => tab.id === id);
      if (idx < 0) return;

      let tab = store.tabs[idx];
      editor.getModel(Uri.parse(`file:///${tab.name}.${tab.type}`)).dispose();
      editor.createModel(
        tab.source,
        tab.type === 'tsx' ? 'typescript' : 'css',
        Uri.parse(`file:///${name}.${tab.type}`),
      );

      set('tabs', idx, 'name', name);
    },
    setTabType(id: string, type: string) {
      const idx = store.tabs.findIndex((tab) => tab.id === id);
      if (idx < 0) return;

      let tab = store.tabs[idx];
      editor.getModel(Uri.parse(`file:///${tab.name}.${tab.type}`)).dispose();
      editor.createModel(
        tab.source,
        type === 'tsx' ? 'typescript' : 'css',
        Uri.parse(`file:///${tab.name}.${type}`),
      );

      set('tabs', idx, 'type', type);
    },
    removeTab(id: string) {
      const idx = store.tabs.findIndex((tab) => tab.id === id);
      const tab = store.tabs[idx];

      if (!tab) return;

      const confirmDeletion = confirm(`Are you sure you want to delete ${tab.name}.${tab.type}?`);
      if (!confirmDeletion) return;

      editor.getModel(Uri.parse(`file:///${tab.name}.${tab.type}`)).dispose();

      // We want to redirect to another tab if we are deleting the current one
      if (store.current === id) {
        set({
          current: store.tabs[idx - 1].id,
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

      editor.createModel('', 'typescript', Uri.parse(`file:///tab${store.tabs.length}.tsx`));

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
      });
    },
  }),
});

export { Store, useStore };

export interface Tab {
  id: string;
  name: string;
  type: string;
  source: string;
}

export type ReplTab = Pick<Tab, 'name' | 'source'>;
