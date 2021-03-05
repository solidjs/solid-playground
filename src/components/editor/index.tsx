import { Component, createEffect, onMount, splitProps, JSX, Show, createSignal } from 'solid-js';
import * as monaco from 'monaco-editor';

import { Icon } from '@amoutonbrady/solid-heroicons';
import {
  clipboard,
  code,
  checkCircle,
  clipboardCheck,
} from '@amoutonbrady/solid-heroicons/outline';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import sPackageJson from '/node_modules/solid-js/package.json';
import sIndex from '/node_modules/solid-js/types/index.d.ts?raw'
import sJsx from '/node_modules/solid-js/types/jsx.d.ts?raw'
import sArray from '/node_modules/solid-js/types/reactive/array.d.ts?raw';
import sMutable from '/node_modules/solid-js/types/reactive/mutable.d.ts?raw';
import sScheduler from '/node_modules/solid-js/types/reactive/scheduler.d.ts?raw';
import sSignal from '/node_modules/solid-js/types/reactive/signal.d.ts?raw';
import sState from '/node_modules/solid-js/types/reactive/state.d.ts?raw';
import sStateModifier from '/node_modules/solid-js/types/reactive/stateModifiers.d.ts?raw';
import sComponent from '/node_modules/solid-js/types/render/component.d.ts?raw';
import sFlow from '/node_modules/solid-js/types/render/flow.d.ts?raw';
import sHydration from '/node_modules/solid-js/types/render/hydration.d.ts?raw';
import sRenderIndex from '/node_modules/solid-js/types/render/index.d.ts?raw';
import sSuspense from '/node_modules/solid-js/types/render/Suspense.d.ts?raw';

import sWebPackageJson from '/node_modules/solid-js/web/package.json';
import sClient from '/node_modules/solid-js/web/types/client.d.ts?raw';
import sCore from '/node_modules/solid-js/web/types/core.d.ts?raw';
import sWebIndex from '/node_modules/solid-js/web/types/index.d.ts?raw';
import sWebJsx from '/node_modules/solid-js/web/types/jsx.d.ts?raw';
import sServerMock from '/node_modules/solid-js/web/types/server-mock.d.ts?raw';
import sJsxRuntime from '/node_modules/solid-js/jsx-runtime.d.ts?raw';
const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    'onDocChange',
    'value',
    'disabled',
    'defaultValue',
    'styles',
    'canCopy',
    'classList',
    'canFormat',
    'onFormat',
    'class',
    'isDark',
  ]);

  let parent!: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor;

  const [format, setFormat] = createSignal(false);
  function formatCode() {
    internal.onFormat(editor.getValue());
    setFormat(true);
    setTimeout(setFormat, 750, false);
  }

  const [clip, setClip] = createSignal(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(editor.getValue()).then(() => {
      setClip(true);
      setTimeout(setClip, 750, false);
    });
  }

  // Initialize CodeMirror
  onMount(() => {
    self.MonacoEnvironment = {
      getWorker: function(moduleId, label) {
        if (label === 'typescript' || label === 'javascript') {
          return new tsWorker();
        }
        return new editorWorker();
      },
    };
    let Uri =monaco.Uri;

    editor = monaco.editor.create(parent, {
      model: monaco.editor.createModel(internal.defaultValue || internal.value || '', "typescript", Uri.parse("inmemory://model/main.tsx")),
    });
    
    monaco.editor.createModel(JSON.stringify(sPackageJson), 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/package.json'));
    monaco.editor.createModel(sIndex,'typescript',  Uri.parse('inmemory://model/node_modules/solid-js/types/index.d.ts'));
    monaco.editor.createModel(sJsx, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/jsx.d.ts'));
    monaco.editor.createModel(sArray, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/reactive/array.d.ts'));
    monaco.editor.createModel(sMutable,'typescript',  Uri.parse('inmemory://model/node_modules/solid-js/types/reactive/mutable.d.ts'));
    monaco.editor.createModel(sScheduler, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/reactive/scheduler.d.ts'));
    monaco.editor.createModel(sSignal,'typescript',  Uri.parse('inmemory://model/node_modules/solid-js/types/reactive/signal.d.ts'));
    monaco.editor.createModel(sState, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/reactive/state.d.ts'));
    monaco.editor.createModel(sStateModifier, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/reactive/stateModifiers.d.ts'));
    monaco.editor.createModel(sComponent,'typescript',  Uri.parse('inmemory://model/node_modules/solid-js/types/render/component.d.ts'));
    monaco.editor.createModel(sFlow,'typescript',  Uri.parse('inmemory://model/node_modules/solid-js/types/render/flow.d.ts'));
    monaco.editor.createModel(sHydration,'typescript',  Uri.parse('inmemory://model/node_modules/solid-js/types/render/hydration.d.ts'));
    monaco.editor.createModel(sRenderIndex, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/render/index.d.ts'));
    monaco.editor.createModel(sSuspense, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/types/render/Suspense.d.ts'));
    monaco.editor.createModel(JSON.stringify(sWebPackageJson), 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/web/package.json'));
    monaco.editor.createModel(sClient, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/web/types/client.d.ts'));
    monaco.editor.createModel(sCore, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/web/types/core.d.ts'));
    monaco.editor.createModel(sWebIndex, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/web/types/index.d.ts'));
    monaco.editor.createModel(sWebJsx, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/web/types/jsx.d.ts'));
    monaco.editor.createModel(sServerMock, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/web/types/server-mock.d.ts'));
    monaco.editor.createModel(sJsxRuntime, 'typescript', Uri.parse('inmemory://model/node_modules/solid-js/jsx-runtime.d.ts'));

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    lib: ['es6', 'DOM', "dom.iterable"],
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    allowNonTsExtensions: true,
  });

    editor.onDidChangeModelContent(()=>{
      internal.onDocChange(editor.getValue());
    })
  });

  createEffect(() => {
    if (!editor) return;
    editor.setValue(internal.value);
  });

  return (
    <div
      {...external}
      class={`grid ${internal.class || ''}`}
      classList={{ ...(internal.classList || {}), relative: internal.canCopy }}
      style="grid-template-rows: 1fr auto"
    >
      <div class="p-0 text-0.5sm md:text-sm overflow-auto" ref={parent}></div>

      <div
        class="flex justify-end space-x-2 p-2"
        classList={{ hidden: !internal.canFormat && !internal.canCopy }}
      >
        <Show when={internal.canFormat}>
          <button
            type="button"
            onClick={formatCode}
            class="inline-flex items-center p-1 rounded-lg text-sm uppercase leading-none focus:outline-none focus:ring-1"
            title="Format the source code"
            classList={{
              'text-blueGray-400': !format(),
              'text-green-900': format(),
            }}
          >
            <span class="sr-only">{format() ? 'Code formatted!' : 'Format code'}</span>
            <Icon path={format() ? checkCircle : code} class="h-6" />
          </button>
        </Show>

        <Show when={internal.canCopy}>
          <button
            type="button"
            onClick={copyToClipboard}
            class="inline-flex items-center p-1 rounded-lg text-sm uppercase leading-none focus:outline-none focus:ring-1"
            title="Copy the source code"
            classList={{
              'text-blueGray-400': !clip(),
              'text-green-900': clip(),
            }}
          >
            <span class="sr-only">{clip() ? 'Copied!' : 'Copy'}</span>
            <Icon path={clip() ? clipboardCheck : clipboard} class="h-6" />
          </button>
        </Show>
      </div>
    </div>
  );
};

export default Editor;

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  onDocChange?: (code: string) => unknown;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  styles?: Record<string, any>;
  canCopy?: boolean;
  canFormat?: boolean;
  isDark?: boolean;
  onFormat?: (code: string) => unknown;
}
