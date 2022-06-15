import { Component, createEffect, onCleanup } from 'solid-js';
import type { Tab } from '../..';
import { Uri, editor } from 'monaco-editor';
import { keyedMap } from '../../utils/keyedMap';

const MonacoTabs: Component<{ folder: string; tabs: Tab[]; compiled: string }> = (props) => {
  const fileUri = Uri.parse(`file:///${props.folder}/output_dont_import.tsx`);

  const oldModel = editor.getModels().find((model) => model.uri.path === fileUri.path);
  if (oldModel) oldModel.dispose();

  const model = editor.createModel('', 'typescript', fileUri);

  createEffect(() => {
    model.setValue(props.compiled);
  });
  onCleanup(() => model.dispose());

  keyedMap<Tab>({
    by: (tab) => tab.name,
    get each() {
      return props.tabs;
    },
    children: (tab) => {
      const uri = Uri.parse(`file:///${props.folder}/${tab().name}`);

      const model = editor.createModel(tab().source, undefined, uri);

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
