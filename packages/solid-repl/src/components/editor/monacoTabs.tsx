import { Component, createEffect, onCleanup, untrack } from 'solid-js';
import type { Tab } from 'solid-repl';
import { Uri, editor, IDisposable } from 'monaco-editor';

const MonacoTabs: Component<{ folder: string; tabs: Tab[] }> = (props) => {
  const key = (tab: Tab) => `file:///${props.folder}/${tab.name}`;
  let currentTabs = new Map<string, { model: editor.ITextModel; watcher: IDisposable }>();
  let syncing = false;
  createEffect(() => {
    const newTabs = new Map<string, { model: editor.ITextModel; watcher: IDisposable }>();
    syncing = true;
    for (const tab of props.tabs) {
      const keyValue = key(tab);
      const lookup = currentTabs.get(keyValue);
      const source = untrack(() => tab.source);
      if (!lookup) {
        const uri = Uri.parse(keyValue);
        const model = editor.createModel(source, undefined, uri);
        const watcher = model.onDidChangeContent(() => {
          if (!syncing) tab.source = model.getValue();
        });
        newTabs.set(keyValue, { model, watcher });
      } else {
        lookup.model.setValue(source);
        lookup.watcher.dispose();
        lookup.watcher = lookup.model.onDidChangeContent(() => {
          if (!syncing) tab.source = lookup.model.getValue();
        });
        newTabs.set(keyValue, lookup);
      }
    }
    syncing = false;

    for (const [old, lookup] of currentTabs) {
      if (!newTabs.has(old)) lookup.model.dispose();
    }
    currentTabs = newTabs;
  });
  onCleanup(() => {
    for (const lookup of currentTabs.values()) lookup.model.dispose();
  });

  return <></>;
};
export default MonacoTabs;
