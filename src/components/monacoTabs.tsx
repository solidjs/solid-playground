import { Component, createEffect, createRoot, createSignal, onCleanup, untrack } from 'solid-js';
import { Tab } from '..';
import { Uri, editor } from 'monaco-editor';

// A modified version of Ryan's https://codesandbox.io/s/explicit-keys-4iyen?file=/Key.js
// This version is designed to call a function on creation and onCleanup on removal
// for a certain keying function (the by parameter)
// this does not return any values, and is designed as more of a hook
const keyedMap = <T,>(props: {
  by: (a: T) => string;
  children: (a: () => T) => void;
  each: T[];
}) => {
  const key = props.by;
  const mapFn = props.children;
  const disposers = new Map();
  let prev = new Map();
  onCleanup(() => {
    for (const disposer of disposers.values()) disposer();
  });

  return createEffect(() => {
    const list = props.each || [];
    const newNodes = new Map();
    return untrack(() => {
      for (let i = 0; i < list.length; i++) {
        const listItem = list[i];
        const keyValue = key(listItem);
        const lookup = prev.get(keyValue);
        if (!lookup) {
          createRoot((dispose) => {
            disposers.set(keyValue, dispose);
            const item = createSignal(listItem, true);
            const result = mapFn(item[0]);
            newNodes.set(keyValue, { item, result });
            return result;
          });
        } else {
          lookup.item[1](listItem);
          newNodes.set(keyValue, lookup);
        }
      }
      // disposal
      for (const old of prev.keys()) {
        if (!newNodes.has(old)) disposers.get(old)();
      }
      prev = newNodes;
    });
  });
};

const MonacoTabs: Component<{ tabs: Tab[]; compiled: string }> = (props) => {
  const fileUri = Uri.parse(`file:///output_dont_import.tsx`);
  const model = editor.createModel('', 'typescript', fileUri);
  createEffect(() => {
    model.setValue(props.compiled.replace(/(https:\/\/cdn.skypack.dev\/)|(@[0-9.]+)/g, ''));
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
