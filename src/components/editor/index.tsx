import {
  Component,
  createEffect,
  onMount,
  splitProps,
  JSX,
  Show,
  createSignal,
} from "solid-js";

import { Icon } from "@amoutonbrady/solid-heroicons";
import {
  clipboard,
  clipboardCheck,
} from "@amoutonbrady/solid-heroicons/outline";

import { basicSetup, EditorState, EditorView } from "./basicSetup";

const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    "onDocChange",
    "value",
    "disabled",
    "defaultValue",
    "styles",
    "canCopy",
    "classList",
  ]);

  let parent!: HTMLDivElement;
  let state: EditorState;
  let view: EditorView;

  /**
   * This creates a new EditorState. This is helpful stay in control of the
   * content from the outside of CodeMirror.
   *
   * @param doc {string} - The new document string
   * @param disabled {boolean} - Whether the editor is readonly or not
   */
  function createEditorState(
    doc: string,
    disabled: boolean = false
  ): EditorState {
    return EditorState.create({
      doc,
      extensions: [
        basicSetup(internal.styles),
        EditorView.updateListener.of((update) => {
          // This trigger the onDocChange event and save the cursor
          // for the next state.
          if (update.docChanged && internal.onDocChange) {
            if (internal.value === update.state.doc.toString()) return;

            internal.onDocChange(update.state.doc.toString());
          }
        }),
        ...(disabled ? [EditorView.editable.of(false)] : []),
      ],
    });
  }

  const [clip, setClip] = createSignal(false);
  function copyToClipboard() {
    navigator.clipboard.writeText(view.state.doc.toString()).then(() => {
      setClip(true);
      setTimeout(setClip, 3000, false);
    });
  }

  // Initialize CodeMirror
  onMount(() => {
    state = createEditorState(
      internal.defaultValue || internal.value || "",
      internal.disabled
    );
    view = new EditorView({ state, parent });
  });

  createEffect(() => {
    if (!view) return;
    view.setState(createEditorState(internal.value, internal.disabled));
  });

  return (
    <div
      {...external}
      classList={{ ...(internal.classList || {}), relative: internal.canCopy }}
    >
      <div ref={parent}></div>

      <Show when={internal.canCopy}>
        <button
          type="button"
          onClick={copyToClipboard}
          class="absolute bottom-5 right-5 inline-flex items-center space-x-1 px-3 py-2 rounded-lg text-sm uppercase leading-none focus:outline-none focus:ring-1"
          classList={{
            "bg-brand-default text-white": !clip(),
            "text-green-900 bg-green-50": clip(),
          }}
        >
          <span class="-mb-0.5">{clip() ? "Copied!" : "Copy"}</span>
          <Icon path={clip() ? clipboardCheck : clipboard} class="h-4" />
        </button>
      </Show>
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
}
