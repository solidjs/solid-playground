import { Component } from 'solid-js';
import { editor as mEditor } from 'monaco-editor';

export declare const Repl: Component<{
  compiler: Worker;
  formatter?: Worker;
  isHorizontal: boolean;
  interactive: boolean;
  actionBar: boolean;
  editableTabs: boolean;
  dark: boolean;
  tabs: Tab[];
  id: string;
  version?: string;
  setTabs: (tab: Tab[]) => void;
  current: string;
  setCurrent: (tabId: string) => void;
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
