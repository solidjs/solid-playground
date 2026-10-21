import { createMemo, flush, untrack, type Accessor } from 'solid-js';
import type { Tab } from '../types';

export interface FileEntry {
  readonly id: string;
  readonly name: string;
  readonly source: string;
}

export interface Workspace {
  files: Accessor<FileEntry[]>;
  byId(id: string): FileEntry | undefined;
  byName(name: string): FileEntry | undefined;
  nameOf(id: string): string | undefined;
  uriOf(id: string): string | undefined;
  isProtected(id: string): boolean;
  create(name: string, source?: string): FileEntry | undefined;
  rename(id: string, next: string): boolean;
  remove(id: string): boolean;
  setSource(id: string, source: string): void;
}

export interface WorkspaceOptions {
  tabs: Accessor<Tab[]>;
  setTabs(tabs: Tab[]): void;
  folder: Accessor<string>;
  entry: string;
}

export function createWorkspace(opts: WorkspaceOptions): Workspace {
  const files = createMemo<FileEntry[]>(() => {
    const seen = new Set<string>();
    return opts.tabs().map((tab, index) => {
      let id = tab.id ?? `name:${tab.name}`;
      if (seen.has(id)) id = `${id}#${index}`;
      seen.add(id);
      return { id, name: tab.name, source: tab.source };
    });
  });

  const byId = (id: string) => files().find((f) => f.id === id);
  const byName = (name: string) => files().find((f) => f.name === name);

  const update = (file: FileEntry, patch: Partial<Tab>) =>
    opts.setTabs(opts.tabs().map((tab) => (tab.name === file.name ? { ...tab, ...patch } : tab)));

  // Solid 2 applies writes on the next microtask. Structural edits come from user actions and
  // their callers read the result right away (open the new file, retitle the tab), so apply them now.
  const commit = (tabs: Tab[]) => {
    opts.setTabs(tabs);
    flush();
  };

  return {
    files,
    byId,
    byName,
    nameOf: (id) => byId(id)?.name,
    uriOf: (id) => {
      const name = byId(id)?.name;
      return name ? `file:///${opts.folder()}/${name}` : undefined;
    },
    isProtected: (id) => byId(id)?.name === opts.entry,

    // Mutations are imperative and can run synchronously inside effects (e.g. a CodeMirror
    // dispatch made from an effect re-enters setSource), so they read state untracked.
    create: (name, source = '') =>
      untrack(() => {
        const trimmed = name.trim();
        if (!trimmed) return undefined;
        if (byName(trimmed)) {
          alert('A file with that name already exists');
          return undefined;
        }
        commit(opts.tabs().concat({ name: trimmed, source }));
        return byName(trimmed);
      }),

    rename: (id, next) =>
      untrack(() => {
        const file = byId(id);
        const trimmed = next.trim();
        if (!file || !trimmed || trimmed === file.name || file.name === opts.entry) return false;
        if (byName(trimmed)) {
          alert('A file with that name already exists');
          return false;
        }
        commit(opts.tabs().map((tab) => (tab.name === file.name ? { ...tab, id, name: trimmed } : tab)));
        return true;
      }),

    remove: (id) =>
      untrack(() => {
        const file = byId(id);
        if (!file || file.name === opts.entry) return false;
        commit(opts.tabs().filter((tab) => tab.name !== file.name));
        return true;
      }),

    setSource: (id, source) =>
      untrack(() => {
        const file = byId(id);
        if (file && file.source !== source) update(file, { source });
      }),
  };
}
