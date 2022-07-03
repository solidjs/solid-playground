import { Component, createEffect, onCleanup, untrack } from 'solid-js';
import type { Tab } from '../..';
import { Uri, editor } from 'monaco-editor';

const MonacoTabs: Component<{ folder: string; tabs: Tab[]; compiled: string }> = (props) => {
  createEffect(() => {
    const uri = Uri.parse(`file:///${props.folder}/output_dont_import.tsx`);
    const model = editor.createModel('', 'typescript', uri);
    createEffect(() => model.setValue(props.compiled));
    onCleanup(() => model.dispose());
  });

  const key = (tab: Tab) => `file:///${props.folder}/${tab.name}`;
  let currentTabs = new Map<string, editor.ITextModel>();
  let syncing = false;
  createEffect(() => {
    const newTabs = new Map<string, editor.ITextModel>();
    syncing = true;
    for (const tab of props.tabs) {
      const keyValue = key(tab);
      const lookup = currentTabs.get(keyValue);
      const source = untrack(() => tab.source);
      if (!lookup) {
        const uri = Uri.parse(keyValue);
        const model = editor.createModel(source, undefined, uri);
        newTabs.set(keyValue, model);
        model.onDidChangeContent(() => {
          if (!syncing) tab.source = model.getValue();
        });
      } else {
        lookup.setValue(source);
        newTabs.set(keyValue, lookup);
      }
    }
    syncing = false;

    for (const [old, model] of currentTabs) {
      if (!newTabs.has(old)) model.dispose();
    }
    currentTabs = newTabs;
  });
  onCleanup(() => {
    for (const model of currentTabs.values()) model.dispose();
  });

  return <></>;
};
export default MonacoTabs;
