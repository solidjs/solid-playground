import { Component } from 'solid-js';

export declare const Repl: Component<{
  compiler: Worker;
  formatter?: Worker;
  isHorizontal: boolean;
  interactive: boolean;
  actionBar: boolean;
  editableTabs: boolean;
  dark: boolean;
  tabs: Tab[];
  setTabs: (x: Tab[]) => void;
  current: string;
  setCurrent: (x: string) => void;
  version?: string;
  onEditorReady?: (editor: mEditor.IStandaloneCodeEditor) => unknown;
}>;

export interface Tab {
  name: string;
  type: string;
  source: string;
}

interface PlaygroundFile {
  name?: string;
  description?: string;
  files: {
    name: string;
    content: string | string[];
  }[];
}

export function processImport({ files }: PlaygroundFile): Tab[];
export function createTabList(initialTabs: Tab[]): [() => Tab[], (t: Tab[]) => void];

export declare const defaultTabs: Tab[];
