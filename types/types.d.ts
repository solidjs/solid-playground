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
  current: string | undefined;
  setCurrent: (tabId: string) => void;
  onEditorReady?: (editor: mEditor.IStandaloneCodeEditor) => unknown;
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}>;

export interface Tab {
  name: string;
  source: string;
}

export declare const defaultTabs: Tab[];
