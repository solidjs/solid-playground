import { Component, createEffect, on, onCleanup } from 'solid-js';
import type { Tab } from '../..';
import { Uri, editor } from 'monaco-editor';
import { KeyedMap } from '../../utils/keyedMap';

const MonacoTabs: Component<{ folder: string; tabs: Tab[]; compiled: string }> = (props) => {
  const syncTab = (name: string, source: () => string) => {
    const uri = Uri.parse(`file:///${props.folder}/${name}`);
    const model = editor.createModel(source(), undefined, uri);

    let first = true;
    createEffect(
      on(source, (mysource) => {
        if (first) return (first = false);
        if (model.getValue() !== mysource) model.setValue(mysource);
      }),
    );
    onCleanup(() => model.dispose());
  };

  syncTab('output_dont_import.tsx', () => props.compiled);

  return (
    <KeyedMap by={(tab) => tab.name} each={props.tabs}>
      {(tab) => {
        syncTab(tab().name, () => tab().source);
      }}
    </KeyedMap>
  );
};
export default MonacoTabs;
