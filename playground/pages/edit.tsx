import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import CompilerWorker from '../../src/workers/compiler?worker';
import FormatterWorker from '../../src/workers/formatter?worker';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import { batch, createResource, createSignal, lazy, onCleanup, Show, Suspense } from 'solid-js';
import { useMatch, useNavigate, useParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { defaultTabs } from '../../src';
import type { Tab } from 'solid-repl';
import type { APIRepl } from './home';
import { Header } from '../components/header';
import { compressToURL } from '@amoutonbrady/lz-string';

const Repl = lazy(() => import('../../src/components/repl'));

window.MonacoEnvironment = {
  getWorker(_moduleId: unknown, label: string) {
    switch (label) {
      case 'css':
        return new cssWorker();
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

  const params = useParams();
  const context = useAppContext()!;
  const navigate = useNavigate();

  let disableFetch: true | undefined;

  let readonly = () => !scratchpad() && context.user()?.display != params.user;

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
    async ({ repl, scratchpad }) => {
      if (disableFetch) {
        disableFetch = undefined;
        return resource.latest;
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

      if (context.token && context.user()?.display == params.user) {
        fetch(`${API}/repl/${params.repl}`, {
          method: 'PUT',
          headers: {
            'authorization': `Bearer ${context.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
            let url = new URL(location.origin);
            url.hash = compressToURL(JSON.stringify(context.tabs()));
            console.log('Shareable url:', url.href);

            try {
              const response = await fetch('/', { method: 'PUT', body: `{"url":"${url.href}"}` });
              if (response.status >= 400) {
                throw new Error(response.statusText);
              }
              const hash = await response.text();
              const tinyUrl = new URL(location.origin);
              tinyUrl.searchParams.set('hash', hash);
              return tinyUrl.toString();
            } catch {
              return url.href;
            }
          } else {
            return location.href;
          }
        }}
      >
        {resource()?.title && (
          <input
            class="bg-transparent px-3 py-1.5 border border-solid border-transparent rounded transition focus:border-blue-600 focus:outline-none"
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
            class="animate-spin h-12 w-12 text-white m-auto"
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
            isHorizontal={props.horizontal}
            dark={context.dark()}
            tabs={tabs()}
            setTabs={setTabs}
            current={current()}
            setCurrent={setCurrent}
            id={'repl'}
          />
        </Show>
      </Suspense>
    </>
  );
};
