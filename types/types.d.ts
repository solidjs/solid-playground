import { Component } from 'solid-js';
import { editor as mEditor } from 'monaco-editor';

export type Repl = Component<{
  compiler: Worker;
  formatter?: Worker;
  isHorizontal: boolean;
  dark: boolean;
  tabs: Tab[];
  id: string;
  setTabs: (tab: Tab[]) => void;
  current: string;
  setCurrent: (tabId: string) => void;
  onEditorReady?: (editor: mEditor.IStandaloneCodeEditor) => unknown;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
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
    type?: 'tsx' | 'css';
    content: string | string[];
  }[];
}

export function processImport({ files }: PlaygroundFile): Tab[];
export function createTabList(initialTabs: Tab[]): [() => Tab[], (t: Tab[]) => void];

export declare const defaultTabs: Tab[];
