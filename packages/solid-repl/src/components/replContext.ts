import { createContext, useContext, type Accessor } from 'solid-js';
import type { Tab } from 'solid-repl';
import type { CodemirrorTabs } from './editor/codemirrorTabs';

export interface ReplApi {
  tabs: Accessor<Tab[]>;
  setTabs: (tabs: Tab[]) => void;
  current: Accessor<string | undefined>;
  reset: () => void;
  onUserEdit?: () => void;

  isDark: Accessor<boolean>;
  fontSize: Accessor<number>;
  displayErrors: Accessor<boolean>;
  setDisplayErrors: (v: boolean) => void;

  compiler: Worker;
  formatter: Worker;
  linter: Worker;

  editors: CodemirrorTabs;

  folder: string;
  uriFor: (name: string) => string;
}

export const ReplContext = createContext<ReplApi>();

export const useRepl = (): ReplApi => {
  const ctx = useContext(ReplContext);
  if (!ctx) throw new Error('useRepl must be called inside <ReplContext.Provider>');
  return ctx;
};
