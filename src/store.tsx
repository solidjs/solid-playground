import { decompressFromEncodedURIComponent } from "lz-string";
import { createState, createContext, useContext, Component } from "solid-js";

import { uid } from "./utils/uid";

const defaultTabs: Tab[] = [
  {
    id: uid(),
    name: "app",
    type: "tsx",
    source:
      "import { render } from 'solid-js/web'\n\nconst App = () => <h1>Hello world</h1>\n\nrender(App, document.body)",
  },
];

function parseHash(hash: string, fallback = defaultTabs) {
  try {
    return JSON.parse(decompressFromEncodedURIComponent(hash)!);
  } catch {
    return fallback;
  }
}

function createStore() {
  const url = new URL(location.href);
  const initialTabs = url.hash && parseHash(url.hash.slice(1));
  const params = Object.fromEntries(url.searchParams.entries());
  const tabs = initialTabs || defaultTabs;

  const [state, setState] = createState<{
    current: string;
    tabs: Tab[];
    error: string;
    compiled: string;
    withHeader: boolean;
    isInteractive: boolean;
  }>({
    current: tabs[0].id,
    tabs,
    error: "",
    compiled: "",
    withHeader: params.withHeader !== undefined,
    isInteractive: params.isInteractive !== undefined,
  });

  return [
    state,
    {
      setState,
      get currentTab() {
        return state.tabs.find((tab) => tab.id === state.current);
      },
      setCurrentTab: (current: string) => {
        setState("current", current);
      },
      setTabName(id: string, name: string) {
        // FIXME: Use the below function, at the moment TS is not content
        // ref: https://github.com/ryansolid/solid/blob/master/documentation/state.md#setstatepath-changes
        // setState("tabs", (tabs) => tabs.id === id, "name", name);

        const idx = state.tabs.findIndex((tab) => tab.id === id);
        if (idx < 0) return;

        setState("tabs", idx, "name", name);
      },
      removeTab(id: string) {
        const idx = state.tabs.findIndex((tab) => tab.id === id);
        const tab = state.tabs[idx];

        if (!tab) return;

        const confirmDeletion = confirm(
          `Are you sure you want to delete ${tab.name}.${tab.type}?`
        );
        if (!confirmDeletion) return;

        // We want to redirect to another tab if we are deleting the current one
        if (state.current === id) setState("current", state.tabs[idx - 1].id);

        setState("tabs", (tabs) => [
          ...tabs.slice(0, idx),
          ...tabs.slice(idx + 1),
        ]);
      },
      get currentSource() {
        const idx = state.tabs.findIndex((tab) => tab.id === state.current);
        if (idx < 0) return;

        return state.tabs[idx].source;
      },
      setCurrentSource(source: string) {
        const idx = state.tabs.findIndex((tab) => tab.id === state.current);
        if (idx < 0) return;

        setState("tabs", idx, "source", source);
      },
      addTab() {
        const nextId = uid();

        setState({
          tabs: [
            ...state.tabs,
            {
              id: nextId,
              name: `tab${state.tabs.length}`,
              type: "tsx",
              source: "",
            },
          ],
          current: nextId,
        });
      },
    },
  ] as const;
}

type Store = ReturnType<typeof createStore>;

const StoreContext = createContext<Store>();

export const StoreProvider: Component<Props> = (props) => {
  const store = createStore();

  return (
    <StoreContext.Provider value={store}>
      {props.children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  return useContext(StoreContext);
}

export interface Tab {
  id: string;
  name: string;
  type: string;
  source: string;
}

export type ReplTab = Pick<Tab, "name" | "source">;

interface Props {
  tabs?: ReplTab[];
}
