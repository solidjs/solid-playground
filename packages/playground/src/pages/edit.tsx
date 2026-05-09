import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CompilerWorker from 'solid-repl/repl/compiler?worker';
import FormatterWorker from 'solid-repl/repl/formatter?worker';
import LinterWorker from 'solid-repl/repl/linter?worker';
import { batch, createEffect, createResource, createSignal, lazy, onCleanup, Show, Suspense } from 'solid-js';
import { useLocation, useMatch, useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { decompressFromURL } from '@amoutonbrady/lz-string';
import { defaultTabs } from 'solid-repl/src';
import type { SolidVersion, Tab } from 'solid-repl';
import type { APIRepl } from './home';
import { Header } from '../components/header';
import { Button } from 'solid-repl/src/components/ui/Button';

function parseHash<T>(hash: string, fallback: T): T {
  try {
    return JSON.parse(decompressFromURL(hash) || '');
  } catch {
    return fallback;
  }
}

const normalizeSolidVersion = (version: unknown): SolidVersion => (version === 'v2' ? 'v2' : 'v1');

const solidWebImport = {
  v1: 'solid-js/web',
  v2: '@solidjs/web',
} as const;

const updateSolidWebImport = (source: string, version: SolidVersion) =>
  source.replace(/from\s+(['"])(solid-js\/web|@solidjs\/web)\1/g, (_match, quote) => {
    return `from ${quote}${solidWebImport[version]}${quote}`;
  });

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
};

interface InternalTab extends Tab {
  _source: string;
  _name: string;
}
export const Edit = () => {
  const [searchParams] = useSearchParams();
  const scratchpad = useMatch(() => '/');
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();
  const linter = new LinterWorker();

  const params = useParams<{ user: string; repl: string }>();
  const context = useAppContext()!;
  const navigate = useNavigate();
  const location = useLocation();

  let disableFetch: true | undefined;

  let readonly = () => !scratchpad() && context.profile() != params.user && !localStorage.getItem(params.repl);

  createEffect(() => {
    if (!scratchpad()) return;
    if (location.query.hash) {
      navigate(`/anonymous/${location.query.hash}`);
    } else if (location.hash) {
      const initialTabs = parseHash(location.hash.slice(1), defaultTabs);
      localStorage.setItem(
        'scratchpad',
        JSON.stringify({
          solidVersion: 'v1',
          files: initialTabs.map((x) => ({ name: x.name, content: x.source })),
        }),
      );
      navigate('/', { replace: true });
    }
  });

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

  const [solidVersion, trueSetSolidVersion] = createSignal<SolidVersion>('v1');

  const [current, setCurrent] = createSignal<string | undefined>(undefined, { equals: false });
  const [resource, { mutate }] = createResource<APIRepl, { repl: string | undefined; scratchpad: boolean }>(
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
            solidVersion: 'v1',
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
        trueSetSolidVersion(normalizeSolidVersion(output.solidVersion));
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
      setTabs(
        mapTabs(
          defaultTabs.map((tab) => ({
            ...tab,
            source: updateSolidWebImport(tab.source, solidVersion()),
          })),
        ),
      );
      setCurrent(defaultTabs[0].name);
    });
  };

  const publishScratchpad = async (title: string) => {
    const newRepl = {
      title,
      public: true,
      labels: [] as string[],
      version: '1.0',
      solidVersion: solidVersion(),
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
      solidVersion: newRepl.solidVersion,
      public: newRepl.public,
      size: 0,
      created_at: '',
    }));
    const url = `/${context.profile()}/${id}`;
    disableFetch = true;
    navigate(url);
    return url;
  };

  const [forkPromptFor, setForkPromptFor] = createSignal<string | null>(null);
  const [forkDeclinedFor, setForkDeclinedFor] = createSignal<string | null>(null);
  const forkPromptOpen = () => forkPromptFor() === params.repl;
  const forkDeclined = () => forkDeclinedFor() === params.repl;

  const onUserEdit = () => {
    if (!readonly() || forkDeclined()) return;
    setForkPromptFor(params.repl);
  };

  const updateRepl = debounce(
    () => {
      if (readonly()) return;
      const files = tabs().map((x) => ({ name: x.name, content: x.source }));

      if (scratchpad()) {
        localStorage.setItem('scratchpad', JSON.stringify({ solidVersion: solidVersion(), files }));
      }

      const repl = resource.latest;
      if (!repl) return;

      const loggedIn = context.token && params.user && context.profile() == params.user;

      if (loggedIn || localStorage.getItem(params.repl)) {
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
            solidVersion: solidVersion(),
            public: repl.public,
            labels: repl.labels,
            files,
          }),
        });
      }
    },
    !!scratchpad() ? 10 : 1000,
  );

  const setSolidVersion = (version: SolidVersion) => {
    batch(() => {
      trueSetSolidVersion(version);
      setTabs(
        tabs().map((tab) => ({
          name: tab.name,
          source: tab.name === 'import_map.json' ? tab.source : updateSolidWebImport(tab.source, version),
        })),
      );
    });
    updateRepl();
  };

  return (
    <>
      <Header
        compiler={compiler}
        fork={() => {}}
        solidVersion={solidVersion()}
        share={async () => {
          if (scratchpad()) {
            const url = await publishScratchpad(`${context.user()?.display || 'Anonymous'}'s Scratchpad`);
            return `${window.location.origin}${url}`;
          } else if (readonly()) {
            const original = resource.latest;
            const url = await publishScratchpad(original?.title ? `${original.title} (fork)` : 'Forked Repl');
            return `${window.location.origin}${url}`;
          } else {
            return window.location.href;
          }
        }}
      >
        <label class="ml-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <span>Solid</span>
          <select
            class="border-neutral-200 bg-transparent px-2 py-1 dark:border-neutral-700 rounded-md border text-sm transition focus:border-solidc focus:outline-none"
            value={solidVersion()}
            onChange={(e) => setSolidVersion(e.currentTarget.value as SolidVersion)}
          >
            <option value="v1">v1</option>
            <option value="v2">v2</option>
          </select>
        </label>
        <Show when={resource() && (resource()?.title || (scratchpad() && context.token))}>
          <input
            class="w-96 border-transparent bg-transparent px-3 py-1.5 shrink rounded-md border transition focus:border-solidc focus:outline-none"
            value={resource()?.title ?? ''}
            placeholder={scratchpad() ? 'Name this repl to save it' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            onChange={(e) => {
              const title = e.currentTarget.value;
              if (scratchpad() || readonly()) {
                if (title) publishScratchpad(title);
              } else {
                mutate((x) => x && { ...x, title });
                updateRepl();
              }
            }}
          />
        </Show>
      </Header>
      <Suspense
        fallback={
          <svg
            class="h-12 w-12 animate-spin text-neutral-500 m-auto"
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
            solidVersion={solidVersion()}
            setSolidVersion={setSolidVersion}
            current={current()}
            setCurrent={setCurrent}
            onUserEdit={onUserEdit}
            id="repl"
          />
        </Show>
      </Suspense>
      <Show when={forkPromptOpen()}>
        <div class="top-0 left-0 z-10 h-full w-full bg-black/50 fixed flex items-center justify-center">
          <div
            class="w-96 border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:text-white rounded-lg border shadow-lg dark:bg-neutral-900"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <p class="font-semibold">Fork this repl?</p>
            <p class="mt-2 text-sm opacity-80">
              You're editing someone else's repl. Fork it to a new copy you can save.
            </p>
            <div class="mt-3 gap-2 flex justify-end">
              <Button
                onClick={() => {
                  setForkPromptFor(null);
                  setForkDeclinedFor(params.repl);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setForkPromptFor(null);
                  const original = resource.latest;
                  publishScratchpad(original?.title ? `${original.title} (fork)` : 'Forked Repl');
                }}
              >
                Fork
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
