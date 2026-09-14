import { createContext, useContext } from 'solid-js';
import type { CodemirrorTabs } from './editor/codemirrorTabs';
import type { Command } from '../kernel/commands';
import type { ImportMapController } from '../kernel/importMap';
import type { Workspace } from '../kernel/workspace';

export interface ReplApi {
  workspace: Workspace;
  importMap: ImportMapController;
  commands: Command[];
  editors: CodemirrorTabs;
}

export const ReplContext = createContext<ReplApi>();

export const useRepl = (): ReplApi => {
  const ctx = useContext(ReplContext);
  if (!ctx) throw new Error('useRepl must be called inside <ReplContext.Provider>');
  return ctx;
};
