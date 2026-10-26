import CompilerWorker from 'solid-repl/repl/compiler?worker';
import FormatterWorker from 'solid-repl/repl/formatter?worker';
import { createEffect, createMemo, createSignal, lazy, Loading, onCleanup, onSettled, Show, untrack } from 'solid-js';
import { useLocation, useMatch, useNavigate, useParams } from '@solidjs/router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { decompressFromURL } from '@amoutonbrady/lz-string';
import {
  DEFAULT_SOLID_VERSION,
  defaultTabs,
  IMPORT_MAP_FILE,
  isSolidV2,
  solidVersionFromImportMap,
} from 'solid-repl/src';
import { Button, useDialog } from 'solid-repl/src/internal';
import type { ReplStorage, Tab } from 'solid-repl/src';
import type { APIRepl } from './home';
import { Header } from '../components/header';
import { Spinner } from '../components/spinner';
import { fetchSolidPackageInfo } from '../components/versionDropdown';
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

const isVersionTag = (version: string) => version === 'next' || version === 'latest';

const resolveVersionTag = async (stored: string): Promise<string> => {
  if (!isVersionTag(stored)) return stored;
  const cacheKey = `solidVersion:${stored}`;
  try {
    const { tags } = await fetchSolidPackageInfo();
    if (tags[stored]) {
      localStorage.setItem(cacheKey, tags[stored]);
      return tags[stored];
    }
  } catch (e) {
    console.error('Failed to resolve solid-js version tag', e);
  }
  return localStorage.getItem(cacheKey) ?? '';
};

const migrateTabs = (tabs: Tab[], version: string): Tab[] => {
  const isV2 = isSolidV2(version || DEFAULT_SOLID_VERSION);
  return tabs.map((tab) => {
    if (tab.name === IMPORT_MAP_FILE) return tab;
    const source = isV2
      ? tab.source.replaceAll('solid-js/web', '@solidjs/web')
      : tab.source.replaceAll('@solidjs/web', 'solid-js/web');
    return source === tab.source ? tab : { ...tab, source };
  });
};

const toTabs = (repl: APIRepl): Tab[] => repl.files.map((x) => ({ name: x.name, source: x.content }));

export const Edit = () => {
  const scratchpad = useMatch(() => '/');
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();
  onCleanup(() => {
    compiler.terminate();
    formatter.terminate();
  });

  const params = useParams<{ user: string; repl: string }>();
  const context = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  let published: APIRepl | undefined;

  const writeToken = () => localStorage.getItem(params.repl);
  const readonly = () => !scratchpad() && context.profile() != params.user && !writeToken();

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

  const [scratchpadVersion, setScratchpadVersion] = createSignal(0);
  createEffect(
    () => ({ isScratchpad: !!scratchpad(), queryHash: location.query.hash, hash: location.hash }),
    ({ isScratchpad, queryHash, hash }) => {
      if (!isScratchpad) return;
      if (queryHash) {
        navigate(`/anonymous/${String(queryHash)}`);
      } else if (hash) {
        const initialTabs = parseHash(hash.slice(1), defaultTabs);
        localStorage.setItem(
          'scratchpad',
          JSON.stringify({ files: initialTabs.map((x) => ({ name: x.name, content: x.source })) }),
        );
        setScratchpadVersion((v) => v + 1);
        navigate('/', { replace: true });
      }
    },
  );

  const loaded = createMemo(async (): Promise<APIRepl> => {
    const repl = params.repl;
    const isScratchpad = !!scratchpad();
    const token = context.token;
    scratchpadVersion();
    const justPublished = published?.id === repl ? published : undefined;
    published = undefined;
    if (justPublished) return justPublished;

    if (isScratchpad) {
      const myScratchpad = localStorage.getItem('scratchpad');
      if (myScratchpad) return JSON.parse(myScratchpad) as APIRepl;
      const output = { files: defaultTabs.map((x) => ({ name: x.name, content: x.source })) } as APIRepl;
      localStorage.setItem('scratchpad', JSON.stringify(output));
      return output;
    }
    const res = await fetch(`${API}/repl/${repl}`, {
      headers: { authorization: token ? `Bearer ${token}` : '' },
    });
    if (!res.ok) throw new Error(`Failed to load repl "${repl}": ${res.status} ${res.statusText}`);
    const body = (await res.json()) as APIRepl;
    if (!Array.isArray(body?.files)) throw new Error(`Failed to load repl "${repl}": unexpected response`);
    return body;
  });

  const [replInfo, setReplInfo] = createSignal<APIRepl | undefined>(() => loaded());
  const [tabs, setTabs] = createSignal<Tab[]>(() => toTabs(loaded()));
  const editTabs = (next: Tab[]) => {
    setTabs(next);
    updateRepl();
  };

  const [solidVersion, setSolidVersion] = createSignal<string>(
    () =>
      solidVersionFromImportMap(loaded().files.find((x) => x.name === IMPORT_MAP_FILE)?.content) ??
      localStorage.getItem('solidVersion') ??
      '',
  );
  const resolvedSolidVersion = createMemo(() => resolveVersionTag(solidVersion()));

  const changeSolidVersion = async (version: string) => {
    setSolidVersion(version);
    localStorage.setItem('solidVersion', version);
    const resolved = await resolveVersionTag(version);
    if (untrack(solidVersion) !== version) return;
    const current = untrack(tabs);
    const migrated = migrateTabs(current, resolved);
    if (migrated.some((tab, i) => tab !== current[i])) editTabs(migrated);
  };

  onSettled(() => {
    context.setTabs(tabs);
    context.setSolidVersion(resolvedSolidVersion);
    return () => {
      context.setTabs(undefined);
      context.setSolidVersion(undefined);
    };
  });

  const reset = async () => {
    const resolved = await resolveVersionTag(untrack(solidVersion));
    editTabs(migrateTabs(defaultTabs, resolved));
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
    published = {
      id,
      title: newRepl.title,
      labels: newRepl.labels,
      files: newRepl.files,
      version: newRepl.version,
      public: newRepl.public,
      size: 0,
      created_at: '',
    };
    setReplInfo(published);
    const url = `/${context.profile()}/${id}`;
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

  const saveScratchpad = debounce(() => {
    const files = tabs().map((x) => ({ name: x.name, content: x.source }));
    localStorage.setItem('scratchpad', JSON.stringify({ files }));
  }, 10);

  const saveRemote = debounce(() => {
    const repl = replInfo();
    if (!repl) return;
    const token = writeToken();
    const loggedIn = context.token && params.user && context.profile() == params.user;
    if (!loggedIn && !token) return;
    void fetch(`${API}/repl/${params.repl}`, {
      method: 'PUT',
      headers: {
        'authorization': context.token ? `Bearer ${context.token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(token ? { write_token: token } : {}),
        title: repl.title,
        version: repl.version,
        public: repl.public,
        labels: repl.labels,
        files: tabs().map((x) => ({ name: x.name, content: x.source })),
      }),
    });
  }, 1000);

  const updateRepl = () => {
    if (readonly()) return;
    if (scratchpad()) saveScratchpad();
    else saveRemote();
  };

  return (
    <>
      <Header
        solidVersion={solidVersion()}
        onSolidVersionChange={changeSolidVersion}
        share={async () => {
          if (scratchpad()) {
            const url = await publishScratchpad(`${context.user().display || 'Anonymous'}'s Scratchpad`);
            return `${window.location.origin}${url}`;
          } else if (readonly()) {
            const original = replInfo();
            const url = await publishScratchpad(original?.title ? `${original.title} (fork)` : 'Forked Repl');
            return `${window.location.origin}${url}`;
          } else {
            return window.location.href;
          }
        }}
      >
        <Loading>
          <Show when={replInfo() && (replInfo()?.title || (scratchpad() && context.token))}>
            <input
              class={titleInput}
              value={replInfo()?.title ?? ''}
              placeholder={scratchpad() ? 'Name this repl to save it' : ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              onChange={(e) => {
                const title = e.currentTarget.value;
                if (scratchpad() || readonly()) {
                  if (title) void publishScratchpad(title);
                } else {
                  setReplInfo((x) => x && { ...x, title });
                  updateRepl();
                }
              }}
            />
          </Show>
        </Loading>
      </Header>
      <Loading fallback={<Spinner class={css({ h: 12, w: 12, m: 'auto' })} />}>
        <Show when={replInfo()}>
          <Repl
            compiler={compiler}
            formatter={formatter}
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
      </Loading>
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
              const original = replInfo();
              void publishScratchpad(original?.title ? `${original.title} (fork)` : 'Forked Repl');
            }}
          >
            Fork
          </Button>
        </div>
      </forkDialog.Root>
    </>
  );
};
