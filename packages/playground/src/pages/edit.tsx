import CompilerWorker from 'solid-repl/repl/compiler?worker';
import FormatterWorker from 'solid-repl/repl/formatter?worker';
import LinterWorker from 'solid-repl/repl/linter?worker';
import { createEffect, createResource, createSignal, lazy, onCleanup, Show, Suspense } from 'solid-js';
import { useLocation, useMatch, useNavigate, useParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { decompressFromURL } from '@amoutonbrady/lz-string';
import { defaultTabs, IMPORT_MAP_FILE, isSolidV2, solidVersionFromImportMap } from 'solid-repl/src';
import type { ReplStorage, Tab } from 'solid-repl';
import type { APIRepl } from './home';
import { Header } from '../components/header';
import { Spinner } from '../components/spinner';
import { Button } from 'solid-repl/src/components/ui/Button';
import { useDialog } from 'solid-repl/src/components/ui/Dialog';
import { css } from 'styled-system/css';

function parseHash<T>(hash: string, fallback: T): T {
  try {
    return JSON.parse(decompressFromURL(hash) || '');
  } catch {
    return fallback;
  }
}

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

const Repl = lazy(() => import('solid-repl/src/repl'));

const titleInput = css({
  flex: 1,
  minW: 0,
  maxW: 96,
  px: 3,
  py: 1.5,
  rounded: 'md',
  bg: 'transparent',
  borderWidth: '1px',
  borderColor: 'transparent',
  transition: 'all',
  _focus: { borderColor: 'solidc', outline: 'none' },
});

const dialogActions = css({ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 });

export const Edit = () => {
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

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('solid-repl:editorState:file:///')) safeRemove(key);
  }

  const replStorage: ReplStorage = {
    getLayout: () => readJson('solid-repl:layout'),
    setLayout: (layout) => writeJson('solid-repl:layout', layout),
    getEditorState: (fileId) => readJson(`solid-repl:editorState:${fileId}`),
    setEditorState: (fileId, state) => {
      const key = `solid-repl:editorState:${fileId}`;
      if (state) writeJson(key, state);
      else safeRemove(key);
    },
  };

  createEffect(() => {
    if (!scratchpad()) return;
    if (location.query.hash) {
      navigate(`/anonymous/${location.query.hash}`);
    } else if (location.hash) {
      const initialTabs = parseHash(location.hash.slice(1), defaultTabs);
      localStorage.setItem(
        'scratchpad',
        JSON.stringify({
          files: initialTabs.map((x) => ({ name: x.name, content: x.source })),
        }),
      );
      navigate('/', { replace: true });
    }
  });

  const [tabs, setTabs] = createSignal<Tab[]>([]);
  const editTabs = (next: Tab[]) => {
    setTabs(next);
    updateRepl();
  };

  const storedVersion = localStorage.getItem('solidVersion') ?? '';
  const [solidVersion, setSolidVersion] = createSignal(storedVersion);
  const [resolvedSolidVersion, setResolvedSolidVersion] = createSignal(
    storedVersion === 'next' || storedVersion === 'latest'
      ? (localStorage.getItem(`solidVersion:${storedVersion}`) ?? '')
      : storedVersion,
  );

  const resolveSolidVersion = async (stored: string): Promise<string> => {
    if (stored !== 'next' && stored !== 'latest') return stored;
    const cacheKey = `solidVersion:${stored}`;
    try {
      const res = await fetch('https://data.jsdelivr.com/v1/package/npm/solid-js');
      const { tags } = (await res.json()) as { tags: Record<string, string> };
      if (tags[stored]) {
        localStorage.setItem(cacheKey, tags[stored]);
        return tags[stored];
      }
    } catch (e) {
      console.error('Failed to resolve solid-js version tag', e);
    }
    return localStorage.getItem(cacheKey) ?? '';
  };

  const migrateTabs = (version: string | undefined) => {
    const isV2 = isSolidV2(version);
    const current = tabs();
    const migrated = current.map((tab) => {
      if (tab.name === IMPORT_MAP_FILE) return tab;
      const source = isV2
        ? tab.source.replaceAll('solid-js/web', '@solidjs/web')
        : tab.source.replaceAll('@solidjs/web', 'solid-js/web');
      return source === tab.source ? tab : { ...tab, source };
    });
    if (migrated.some((tab, i) => tab !== current[i])) editTabs(migrated);
  };

  let versionRequest = 0;
  const applySolidVersion = async (version: string, migrate: boolean) => {
    const request = ++versionRequest;
    const resolved = await resolveSolidVersion(version);
    if (request !== versionRequest) return;
    setResolvedSolidVersion(resolved);
    if (migrate) migrateTabs(resolved || undefined);
  };
  if (storedVersion === 'next' || storedVersion === 'latest') applySolidVersion(storedVersion, false);

  const adoptSolidVersion = (importMapSource: string | undefined) => {
    const version = solidVersionFromImportMap(importMapSource);
    if (version) {
      versionRequest++;
      setSolidVersion(version);
      setResolvedSolidVersion(version);
    } else {
      const stored = localStorage.getItem('solidVersion') ?? '';
      setSolidVersion(stored);
      applySolidVersion(stored, false);
    }
  };

  const changeSolidVersion = (version: string) => {
    setSolidVersion(version);
    localStorage.setItem('solidVersion', version);
    applySolidVersion(version, true);
  };

  context.setTabs(tabs);
  onCleanup(() => context.setTabs(undefined));

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
            files: defaultTabs.map((x) => ({ name: x.name, content: x.source })),
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

      adoptSolidVersion(output.files.find((x) => x.name === IMPORT_MAP_FILE)?.content);
      setTabs(output.files.map((x) => ({ name: x.name, source: x.content })));

      return output;
    },
  );

  const reset = () => {
    editTabs(defaultTabs);
    migrateTabs(resolvedSolidVersion() || undefined);
  };

  const publishScratchpad = async (title: string) => {
    const newRepl = {
      title,
      public: true,
      labels: [] as string[],
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
    if (response.status >= 400) throw new Error(response.statusText);

    const { id, write_token } = await response.json();
    if (write_token) {
      localStorage.setItem(id, write_token);
      const repls = localStorage.getItem('repls');
      localStorage.setItem('repls', JSON.stringify(repls ? [...JSON.parse(repls), id] : [id]));
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

  const forkDialog = useDialog({
    open: forkPromptOpen,
    onOpenChange: (open) => {
      if (!open) setForkPromptFor(null);
    },
  });

  const updateRepl = debounce(
    () => {
      if (readonly()) return;
      const files = tabs().map((x) => ({ name: x.name, content: x.source }));

      if (scratchpad()) {
        localStorage.setItem('scratchpad', JSON.stringify({ files }));
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
            public: repl.public,
            labels: repl.labels,
            files,
          }),
        });
      }
    },
    scratchpad() ? 10 : 1000,
  );

  return (
    <>
      <Header
        solidVersion={solidVersion()}
        onSolidVersionChange={changeSolidVersion}
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
        <Show when={resource() && (resource()?.title || (scratchpad() && context.token))}>
          <input
            class={titleInput}
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
      <Suspense fallback={<Spinner class={css({ h: 12, w: 12, m: 'auto' })} />}>
        <Show when={resource()}>
          <Repl
            compiler={compiler}
            formatter={formatter}
            linter={linter}
            version={resolvedSolidVersion() || undefined}
            dark={context.dark()}
            tabs={tabs()}
            setTabs={editTabs}
            reset={reset}
            onUserEdit={onUserEdit}
            storage={replStorage}
            id="repl"
          />
        </Show>
      </Suspense>
      <forkDialog.Root>
        <p class={css({ fontWeight: 'semibold' })}>Fork this repl?</p>
        <p class={css({ mt: 2, fontSize: 'sm', opacity: 0.8 })}>
          You're editing someone else's repl. Fork it to a new copy you can save.
        </p>
        <div class={dialogActions}>
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
      </forkDialog.Root>
    </>
  );
};
