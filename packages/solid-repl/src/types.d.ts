/// <reference types="vite/client" />

declare module 'solid-repl' {
  export interface Tab {
    name: string;
    source: string;
  }

  export const defaultTabs: Tab[];
}

declare module 'solid-repl/dist/repl' {
  export type Repl = import('solid-js').Component<{
    compiler: Worker;
    formatter: Worker;
    linter: Worker;
    isHorizontal: boolean;
    dark: boolean;
    tabs: Tab[];
    id: string;
    hideDevtools?: boolean;
    setTabs: (tab: Tab[]) => void;
    reset: () => void;
    current: string | undefined;
    setCurrent: (tabId: string) => void;
    onUserEdit?: () => void;
  }>;
  const Repl: Repl;
  export default Repl;
}

declare module '*.css';
