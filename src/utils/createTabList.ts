import { batch, createSignal } from 'solid-js';
import type { Tab } from '..';

export const createTabList = (initialTabs: Tab[]): [() => Tab[], (t: Tab[]) => void] => {
  let sourceSignals: Record<string, [get: () => string, set: (value: string) => string]> = {};

  const mapTabs = (tabs: Tab[]): Tab[] => {
    const oldSignals = sourceSignals;
    sourceSignals = {};

    return tabs.map((tab) => {
      const id = tab.name;
      sourceSignals[id] = oldSignals[id] || createSignal(tab.source);
      if (oldSignals[id]) oldSignals[id][1](tab.source);

      return {
        name: tab.name,
        get source() {
          return sourceSignals[id][0]();
        },
        set source(source: string) {
          sourceSignals[id][1](source);
        },
      };
    });
  };

  const [tabs, trueSetTabs] = createSignal(mapTabs(initialTabs), { equals: false });
  return [tabs, (tabs: Tab[]) => batch(() => trueSetTabs(mapTabs(tabs)))];
};
