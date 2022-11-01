import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CompilerWorker from 'solid-repl/repl/compiler?worker';
import FormatterWorker from 'solid-repl/repl/formatter?worker';
import LinterWorker from 'solid-repl/repl/linter?worker';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import { batch, createResource, createSignal, lazy, onCleanup, Show, Suspense } from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { defaultTabs } from 'solid-repl/src';
import type { Tab } from 'solid-repl';
import { Header } from '../components/header';

export interface ReplFile {
  name: string;
  content: string;
}
export interface APIRepl {
  id: string;
  title: string;
  labels: string[];
  files: ReplFile[];
  version: string;
  public: boolean;
  size: number;
  created_at: string;
  updated_at?: string;
}

const Repl = lazy(() => import('../components/setupSolid'));

window.MonacoEnvironment = {
  getWorker(_moduleId: unknown, label: string) {
    switch (label) {
      case 'css':
        return new cssWorker();
      case 'json':
        return new jsonWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
  onigasm,
};

interface InternalTab extends Tab {
  _source: string;
  _name: string;
}
export const Edit = () => {
  const [searchParams] = useSearchParams();
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();
  const linter = new LinterWorker();

  const params = useParams();
  const context = useAppContext()!;
  const navigate = useNavigate();

  let disableFetch: true | undefined;

  const mapTabs = (toMap: (Tab | InternalTab)[]): InternalTab[] =>
    toMap.map((tab) => {
      if ('_source' in tab) return tab;
      return {
        _name: tab.name,
        get name() {
          return this._name;
        },
        set name(name: string) {
          this._name = name;
          updateRepl();
        },
        _source: tab.source,
        get source() {
          return this._source;
        },
        set source(source: string) {
          this._source = source;
          updateRepl();
        },
      };
    });

  const [tabs, trueSetTabs] = createSignal<InternalTab[]>([]);
  const setTabs = (tabs: (Tab | InternalTab)[]) => trueSetTabs(mapTabs(tabs));
  context.setTabs(tabs);
  onCleanup(() => context.setTabs(undefined));

  const [current, setCurrent] = createSignal<string | undefined>(undefined, { equals: false });
  const [resource, { mutate }] = createResource<APIRepl, { repl: string }>(
    () => ({ repl: params.repl }),
    async ({ repl }): Promise<APIRepl> => {
      if (disableFetch) {
        disableFetch = undefined;
        if (resource.latest) return resource.latest;
      }

      let output: APIRepl;

      if (repl) {
        output = await fetch(`${API}/repl/${repl}`).then((r) => r.json());
      } else {
        const myScratchpad = localStorage.getItem('scratchpad');
        if (!myScratchpad) {
          output = {
            files: defaultTabs.map((x) => ({
              name: x.name,
              content: x.source,
            })),
          } as APIRepl;
          localStorage.setItem('scratchpad', JSON.stringify(output));
        } else {
          output = JSON.parse(myScratchpad);
        }
      }

      batch(() => {
        setTabs(
          output.files.map((x) => {
            return { name: x.name, source: x.content };
          }),
        );
        setCurrent(output.files[0].name);
      });

      return output;
    },
  );

  const reset = () => {
    batch(() => {
      setTabs(mapTabs(defaultTabs));
      setCurrent(defaultTabs[0].name);
    });
  };
  const updateRepl = debounce(() => {
    const files = tabs().map((x) => ({ name: x.name, content: x.source }));

    localStorage.setItem('scratchpad', JSON.stringify({ files }));
  }, 10);
  return (
    <>
      <Header
        compiler={compiler}
        fork={() => {}}
        share={async () => {
          const newRepl = {
            title: 'Anonymous Scratchpad',
            public: true,
            labels: [],
            version: '1.0',
            files: tabs().map((x) => ({ name: x.name, content: x.source })),
          };
          const response = await fetch(`${API}/repl`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newRepl),
          });
          if (response.status >= 400) {
            throw new Error(response.statusText);
          }
          const { id } = await response.json();
          mutate(() => ({
            id,
            title: newRepl.title,
            labels: newRepl.labels,
            files: newRepl.files,
            version: newRepl.version,
            public: newRepl.public,
            size: 0,
            created_at: '',
          }));
          const url = `/anonymous/${id}`;
          disableFetch = true;
          navigate(url);
          return `${window.location.origin}${url}`;
        }}
      />
      <Suspense
        fallback={
          <svg
            class="m-auto h-12 w-12 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        }
      >
        <Show when={resource()}>
          <Repl
            compiler={compiler}
            formatter={formatter}
            linter={linter}
            isHorizontal={searchParams.isHorizontal != undefined}
            dark={context.dark()}
            tabs={tabs()}
            setTabs={setTabs}
            reset={reset}
            current={current()}
            setCurrent={setCurrent}
            id="repl"
          />
        </Show>
      </Suspense>
    </>
  );
};
