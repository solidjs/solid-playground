import { createMemo, type Accessor } from 'solid-js';
import type { Tab } from 'solid-repl';

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
  create(name: string, source?: string): FileEntry | undefined;
  rename(id: string, next: string): boolean;
  remove(id: string): boolean;
  isProtected(id: string): boolean;
}

export interface WorkspaceOptions {
  tabs: Accessor<Tab[]>;
  setTabs(tabs: Tab[]): void;
  folder: Accessor<string>;
  entry: string;
}

const derivedId = (name: string) => `name:${name}`;

export function createWorkspace(opts: WorkspaceOptions): Workspace {
  const entry = opts.entry;

  const files = createMemo<FileEntry[]>(() => {
    const seen = new Set<string>();
    return opts.tabs().map((tab, index) => {
      let id = tab.id ?? derivedId(tab.name);
      if (seen.has(id)) id = `${id}#${index}`;
      seen.add(id);

      return {
        id,
        name: tab.name,
        get source() {
          return tab.source;
        },
      };
    });
  });

  const byId = (id: string) => files().find((f) => f.id === id);
  const byName = (name: string) => files().find((f) => f.name === name);

  return {
    files,
    byId,
    byName,
    nameOf: (id) => byId(id)?.name,
    uriOf: (id) => {
      const name = byId(id)?.name;
      return name ? `file:///${opts.folder()}/${name}` : undefined;
    },
    isProtected: (id) => byId(id)?.name === entry,

    create(name, source = '') {
      const trimmed = name.trim();
      if (!trimmed) return undefined;
      if (byName(trimmed)) {
        alert('A file with that name already exists');
        return undefined;
      }
      opts.setTabs(opts.tabs().concat({ name: trimmed, source }));
      return byName(trimmed);
    },

    rename(id, next) {
      const file = byId(id);
      const trimmed = next.trim();
      if (!file || !trimmed || trimmed === file.name) return false;
      if (file.name === entry) return false;
      if (byName(trimmed)) {
        alert('A file with that name already exists');
        return false;
      }

      opts.setTabs(opts.tabs().map((tab) => (tab.name === file.name ? { ...tab, id, name: trimmed } : tab)));
      return true;
    },

    remove(id) {
      const file = byId(id);
      if (!file || file.name === entry) return false;
      opts.setTabs(opts.tabs().filter((tab) => tab.name !== file.name));
      return true;
    },
  };
}
