import { Component, createEffect, onCleanup } from 'solid-js';
import type { Tab } from '..';
import { Uri, editor } from 'monaco-editor';
import { keyedMap } from '../utils/keyedMap';

const MonacoTabs: Component<{ tabs: Tab[]; compiled: string }> = (props) => {
  const fileUri = Uri.parse(`file:///output_dont_import.tsx`);
  const model = editor.createModel('', 'typescript', fileUri);
  createEffect(() => {
    model.setValue(
      props.compiled.replace(/(https:\/\/cdn.skypack.dev\/)|(@[0-9][0-9.\-a-z]+)/g, ''),
    );
  });
  onCleanup(() => model.dispose());

  keyedMap<Tab>({
    by: (tab) => `${tab.name}.${tab.type}`,
    get each() {
      return props.tabs;
    },
    children: (tab) => {
      const uri = Uri.parse(`file:///${tab().name}.${tab().type}`);
      const model = editor.createModel(
        tab().source,
        tab().type === 'tsx' ? 'typescript' : 'css',
        uri,
      );

      let first = true;
      createEffect(() => {
        const source = tab().source;
        if (!first && model.getValue() !== source) model.setValue(source);
        else first = false;
      });
      onCleanup(() => model.dispose());
    },
  });
  return <></>;
};
export default MonacoTabs;
