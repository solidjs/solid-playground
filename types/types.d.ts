import { Component } from 'solid-js';

export declare const Repl: Component<{
  compiler: Worker;
  formatter: Worker;
  isHorizontal: boolean;
  interactive: boolean;
  actionBar: boolean;
  editableTabs: boolean;
  dark: boolean;
  tabs: Tab[];
  setTabs: (x: Tab[]) => void;
}>;
export interface Tab {
  id: string;
  name: string;
  type: string;
  source: string;
}
export declare const defaultTabs: Tab[];
