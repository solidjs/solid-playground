import { createContext, useContext, type Accessor } from 'solid-js';
import type { Tab } from 'solid-repl';
import type { CodemirrorTabs } from './editor/codemirrorTabs';
import type { Command } from '../kernel/commands';
import type { ImportMapState } from '../kernel/importMap';
import type { WorkerClient } from '../kernel/workerClient';
import type { Workspace } from '../kernel/workspace';

export interface ReplApi {
  tabs: Accessor<Tab[]>;
  setTabs: (tabs: Tab[]) => void;
  workspace: Workspace;

  importMap: Accessor<ImportMapState>;
  setPackageUrl: (name: string, url: string) => void;
  addPackage: (name: string) => void;
  removePackage: (name: string) => void;
  current: Accessor<string | undefined>;
  currentName: Accessor<string | undefined>;
  reset: () => void;
  onUserEdit?: () => void;

  isDark: Accessor<boolean>;
  fontSize: Accessor<number>;
  displayErrors: Accessor<boolean>;
  setDisplayErrors: (v: boolean) => void;

  compiler: WorkerClient;
  formatter: WorkerClient;
  linter: WorkerClient;

  commands: Command[];
  editors: CodemirrorTabs;

  folder: string;
}

export const ReplContext = createContext<ReplApi>();

export const useRepl = (): ReplApi => {
  const ctx = useContext(ReplContext);
  if (!ctx) throw new Error('useRepl must be called inside <ReplContext.Provider>');
  return ctx;
};
