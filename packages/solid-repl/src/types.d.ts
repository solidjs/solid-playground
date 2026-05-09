declare module 'solid-repl' {
  export type SolidVersion = 'v1' | 'v2';

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
    solidVersion: import('solid-repl').SolidVersion;
    setSolidVersion: (version: import('solid-repl').SolidVersion) => void;
    current: string | undefined;
    setCurrent: (tabId: string) => void;
    onUserEdit?: () => void;
    onEditorReady?: (
      editor: import('monaco-editor').editor.IStandaloneCodeEditor,
      monaco: {
        Uri: typeof import('monaco-editor').Uri;
        editor: typeof import('monaco-editor').editor;
      },
    ) => void;
  }>;
  const Repl: Repl;
  export default Repl;
}

declare module '*.css';

interface Window {
  MonacoEnvironment: {
    getWorker: (_moduleId: unknown, label: string) => Worker;
  };
}
