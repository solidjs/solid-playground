import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CompilerWorker from 'solid-repl/repl/compiler?worker';
import FormatterWorker from 'solid-repl/repl/formatter?worker';
import LinterWorker from 'solid-repl/repl/linter?worker';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import { batch, createResource, createSignal, lazy, onCleanup, Show, Suspense } from 'solid-js';
import { useMatch, useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { defaultTabs } from 'solid-repl/src';
import type { Tab } from 'solid-repl';
import type { APIRepl } from './home';
import { Header, HeaderButton } from '../components/header';
import { Icon } from 'solid-heroicons';
import { folder, inboxStack } from 'solid-heroicons/outline';

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

  let toggleVisible: () => void;

  return (
    <div class="flex h-full flex-col overflow-hidden">
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
      <div class="flex h-full w-full overflow-hidden">
        <div class="border-r-1 border-bord flex h-full w-[40px] flex-col items-center">
          <HeaderButton title="Folder tree" onClick={() => toggleVisible?.()}>
            <Icon path={folder} class="w-5" />
          </HeaderButton>
          <HeaderButton title="Import map">
            <Icon path={inboxStack} class="w-5" />
          </HeaderButton>
        </div>
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
              setToggleVisible={(tv) => (toggleVisible = tv)}
              id="repl"
            />
          </Show>
        </Suspense>
        <div class="border-l-1 h-full w-[40px] border-slate-200 dark:border-neutral-800">
          <a
            href="https://github.com/solidjs/solid-playground"
            target="_blank"
            class="m-1 flex cursor-alias flex-row rounded p-1 px-1 opacity-80 hover:bg-gray-200 hover:opacity-100 dark:hover:bg-gray-700"
            title="Github"
          >
            <Icon
              viewBox="0 0 96 96"
              class="h-5"
              path={{
                path: (
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                  />
                ),
                outline: false,
                mini: false,
              }}
            />
          </a>
        </div>
      </div>
    </div>
  );
};
