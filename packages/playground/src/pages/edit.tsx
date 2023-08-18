import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CompilerWorker from 'solid-repl/repl/compiler?worker';
import FormatterWorker from 'solid-repl/repl/formatter?worker';
import LinterWorker from 'solid-repl/repl/linter?worker';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import { batch, createResource, createSignal, lazy, onCleanup, Show, Suspense } from 'solid-js';
import { useMatch, useNavigate, useParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { defaultTabs } from 'solid-repl/src';
import type { Tab } from "solid-repl";
import type { APIRepl } from './home';
import { Header } from '../components/header';

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
export const Edit = (props: { horizontal: boolean }) => {
  const scratchpad = useMatch(() => '/scratchpad');
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();
  const linter = new LinterWorker();

  const params = useParams();
  const context = useAppContext()!;
  const navigate = useNavigate();

  let disableFetch: true | undefined;

  let readonly = () => !scratchpad() && context.user()?.display != params.user && !localStorage.getItem(params.repl);

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
  const [resource, { mutate }] = createResource<APIRepl, { repl: string; scratchpad: boolean }>(
    () => ({ repl: params.repl, scratchpad: !!scratchpad() }),
    async ({ repl, scratchpad }): Promise<APIRepl> => {
      if (disableFetch) {
        disableFetch = undefined;
        if (resource.latest) return resource.latest;
      }

      let output: APIRepl;
      if (scratchpad) {
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
      } else {
        output = await fetch(`${API}/repl/${repl}`, {
          headers: { authorization: context.token ? `Bearer ${context.token}` : '' },
        }).then((r) => r.json());
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

  const updateRepl = debounce(
    () => {
      const files = tabs().map((x) => ({ name: x.name, content: x.source }));

      if (readonly()) {
        localStorage.setItem('scratchpad', JSON.stringify({ files }));
        disableFetch = true;
        navigate('/scratchpad');
        return;
      } else if (scratchpad()) {
        localStorage.setItem('scratchpad', JSON.stringify({ files }));
      }

      const repl = resource.latest;
      if (!repl) return;

      if ((context.token && context.user()?.display == params.user) || localStorage.getItem(params.repl)) {
        fetch(`${API}/repl/${params.repl}`, {
          method: 'PUT',
          headers: {
            'authorization': context.token ? `Bearer ${context.token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(localStorage.getItem(params.repl) ? { write_token: localStorage.getItem(params.repl) } : {}),
            title: repl.title,
            version: repl.version,
            public: repl.public,
            labels: repl.labels,
            files,
          }),
        });
      }
    },
    !!scratchpad() ? 10 : 1000,
  );

  return (
    <>
      <Header
        compiler={compiler}
        fork={() => {}}
        share={async () => {
          if (scratchpad()) {
            const newRepl = {
              title: context.user()?.display ? `${context.user()!.display}'s Scratchpad` : 'Anonymous Scratchpad',
              public: true,
              labels: [],
              version: '1.0',
              files: tabs().map((x) => ({ name: x.name, content: x.source })),
            };
            const response = await fetch(`${API}/repl`, {
              method: 'POST',
              headers: {
                'authorization': context.token ? `Bearer ${context.token}` : '',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(newRepl),
            });
            if (response.status >= 400) {
              throw new Error(response.statusText);
            }
            const { id, write_token } = await response.json();
            if (write_token) {
              localStorage.setItem(id, write_token);
              const repls = localStorage.getItem('repls');
              if (repls) {
                localStorage.setItem('repls', JSON.stringify([...JSON.parse(repls), id]));
              } else {
                localStorage.setItem('repls', JSON.stringify([id]));
              }
            }
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
            const url = `/${context.user()?.display || 'anonymous'}/${id}`;
            disableFetch = true;
            navigate(url);
            return `${window.location.origin}${url}`;
          } else {
            return location.href;
          }
        }}
      >
        {resource()?.title && (
          <input
            class="w-96 shrink rounded border border-solid border-transparent bg-transparent px-3 py-1.5 transition focus:border-blue-600 focus:outline-none"
            value={resource()?.title}
            onChange={(e) => {
              mutate((x) => x && { ...x, title: e.currentTarget.value });
              updateRepl();
            }}
          />
        )}
      </Header>
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
            isHorizontal={props.horizontal}
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
