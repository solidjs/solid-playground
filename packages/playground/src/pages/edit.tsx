import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CompilerWorker from 'solid-v1-repl/repl/compiler?worker';
import FormatterWorker from 'solid-v1-repl/repl/formatter?worker';
import LinterWorker from 'solid-v1-repl/repl/linter?worker';
import CompilerWorkerV2 from 'solid-v2-repl/repl/compiler?worker';
import FormatterWorkerV2 from 'solid-v2-repl/repl/formatter?worker';
import LinterWorkerV2 from 'solid-v2-repl/repl/linter?worker';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import { batch, createResource, createSignal, lazy, onCleanup, Show, Suspense, createEffect, untrack } from 'solid-js';
import { useMatch, useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { defaultTabs } from 'solid-repl/src';
import type { Tab } from 'solid-repl';
import type { APIRepl } from './home';
import { Header } from '../components/header';

const ReplV1 = lazy(() => import('../components/setupSolidV1'));
const ReplV2 = lazy(() => import('../components/setupSolidV2'));

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
  const scratchpad = useMatch(() => '/scratchpad');
  const compilerV1 = new CompilerWorker();
  const formatterV1 = new FormatterWorker();
  const linterV1 = new LinterWorker();
  const compilerV2 = new CompilerWorkerV2();
  const formatterV2 = new FormatterWorkerV2();
  const linterV2 = new LinterWorkerV2();

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
              content: context.solidVersion() === '2' ? x.source.replace('solid-js/web', '@solidjs/web') : x.source,
            })),
            version: context.solidVersion(),
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
        const initialVersion = output.version?.startsWith('2') ? '2' : '1';
        context.setSolidVersion(initialVersion);
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
      const updatedTabs = defaultTabs.map(x => ({
        ...x,
        source: context.solidVersion() === '2' ? x.source.replace('solid-js/web', '@solidjs/web') : x.source
      }));
      setTabs(mapTabs(updatedTabs));
      setCurrent(defaultTabs[0].name);
    });
  };

  createEffect(() => {
    const version = context.solidVersion();
    const isLoaded = !!resource();
    if (!isLoaded) return;

    untrack(() => {
      const currentTabs = tabs();
      let changed = false;
      const importMapTab = currentTabs.find(t => t.name === 'import_map.json');
      if (importMapTab) {
        try {
          const map = JSON.parse(importMapTab.source);
          for (const key of Object.keys(map)) {
            if (map[key].startsWith('https://esm.sh/')) {
              if (key === 'solid-js/web') {
                const newValue = version === '2'
                  ? `https://esm.sh/@solidjs/web@2.0.0-beta.0`
                  : `https://esm.sh/solid-js/web`;
                if (map[key] !== newValue) {
                  map[key] = newValue;
                  changed = true;
                }
              } else if (key === 'solid-js' || key.startsWith('solid-js/')) {
                const suffix = key === 'solid-js' ? '' : key.slice('solid-js'.length);
                const newValue = version === '2' 
                  ? `https://esm.sh/solid-js@2.0.0-beta.0${suffix}` 
                  : `https://esm.sh/solid-js${suffix}`;
                if (map[key] !== newValue) {
                  map[key] = newValue;
                  changed = true;
                }
              } else if (key === '@solidjs/web' || key.startsWith('@solidjs/web/')) {
                const suffix = key === '@solidjs/web' ? '' : key.slice('@solidjs/web'.length);
                const newValue = version === '2' 
                  ? `https://esm.sh/@solidjs/web@2.0.0-beta.0${suffix}` 
                  : `https://esm.sh/@solidjs/web${suffix}`;
                if (map[key] !== newValue) {
                  map[key] = newValue;
                  changed = true;
                }
              }
            }
          }
          if (changed) {
            importMapTab.source = JSON.stringify(map, null, 2);
          }
        } catch (e) {}
      }

      currentTabs.forEach((tab) => {
        if (!tab.name.endsWith('.json') && !tab.name.endsWith('.css')) {
          if (version === '2') {
            const v1ToV2: Record<string, string> = {
              'solid-js/web': '@solidjs/web',
              'solid-js/h': '@solidjs/h',
              'solid-js/html': '@solidjs/html',
              'solid-js/universal': '@solidjs/universal',
              'solid-js/store': 'solid-js'
            };
            for (const [v1, v2] of Object.entries(v1ToV2)) {
               if (tab.source.includes(v1)) {
                 tab.source = tab.source.replaceAll(v1, v2);
                 changed = true;
               }
            }
          } else {
            const v2ToV1: Record<string, string> = {
              '@solidjs/web': 'solid-js/web',
              '@solidjs/h': 'solid-js/h',
              '@solidjs/html': 'solid-js/html',
              '@solidjs/universal': 'solid-js/universal'
            };
            for (const [v2, v1] of Object.entries(v2ToV1)) {
               if (tab.source.includes(v2)) {
                 tab.source = tab.source.replaceAll(v2, v1);
                 changed = true;
               }
            }
          }
        }
      });

      if (changed) {
        setTabs([...currentTabs]); // Trigger solid's reactivity
      }
    });
  });

  const updateRepl = debounce(
    () => {
      const files = tabs().map((x) => ({ name: x.name, content: x.source }));

      if (readonly()) {
        localStorage.setItem('scratchpad', JSON.stringify({ files, version: context.solidVersion() }));
        disableFetch = true;
        navigate('/scratchpad');
        return;
      } else if (scratchpad()) {
        localStorage.setItem('scratchpad', JSON.stringify({ files, version: context.solidVersion() }));
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
            version: context.solidVersion(),
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
        compiler={context.solidVersion() === '1' ? compilerV1 : compilerV2}
        fork={() => {}}
        share={async () => {
          if (scratchpad()) {
            const newRepl = {
              title: context.user()?.display ? `${context.user()!.display}'s Scratchpad` : 'Anonymous Scratchpad',
              public: true,
              labels: [],
              version: context.solidVersion(),
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
          <Show when={context.solidVersion() === '1'}>
            <ReplV1
              compiler={compilerV1}
              formatter={formatterV1}
              linter={linterV1}
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
          <Show when={context.solidVersion() === '2'}>
            <ReplV2
              compiler={compilerV2}
              formatter={formatterV2}
              linter={linterV2}
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
        </Show>
      </Suspense>
    </>
  );
};
