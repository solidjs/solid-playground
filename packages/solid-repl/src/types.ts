import type { Component } from 'solid-js';
import type { SerializedDockview } from 'dockview';

export interface Tab {
  name: string;
  source: string;
  id?: string;
}

export interface EditorPersistedState {
  anchor: number;
  head: number;
  topPos: number;
}

export interface ReplStorage {
  getLayout?(): SerializedDockview | undefined;
  setLayout?(layout: SerializedDockview): void;
  getEditorState?(fileId: string): EditorPersistedState | undefined;
  setEditorState?(fileId: string, state: EditorPersistedState | null): void;
}

export interface ReplProps {
  compiler: Worker;
  formatter: Worker;
  linter: Worker;
  dark: boolean;
  tabs: Tab[];
  id: string;
  /** Solid version previews compile and run against; '' or omitted = the bundled default (Solid 2). */
  version?: string;
  hideDevtools?: boolean;
  vertical?: boolean;
  setTabs: (tab: Tab[]) => void;
  reset: () => void;
  onUserEdit?: () => void;
  storage?: ReplStorage;
}

export type Repl = Component<ReplProps>;
