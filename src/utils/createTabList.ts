import { batch, createSignal } from 'solid-js';
import { Tab } from '..';

export const createTabList = (initialTabs: Tab[]): [() => Tab[], (t: Tab[]) => void] => {
  let sourceSignals: Record<string, [get: () => string, set: (value: string) => string]> = {};
  const mapTabs = (t: Tab[]): Tab[] => {
    const oldSignals = sourceSignals;
    sourceSignals = {};
    return t.map((x) => {
      const id = `${x.name}.${x.type}`;
      sourceSignals[id] = oldSignals[id] || createSignal(x.source);
      if (oldSignals[id]) oldSignals[id][1](x.source);
      return {
        name: x.name,
        type: x.type,
        get source() {
          return sourceSignals[id][0]();
        },
        set source(x: string) {
          sourceSignals[id][1](x);
        },
      };
    });
  };
  const [tabs, trueSetTabs] = createSignal(mapTabs(initialTabs), false);
  return [tabs, (t: Tab[]) => batch(() => trueSetTabs(mapTabs(t)))];
};
