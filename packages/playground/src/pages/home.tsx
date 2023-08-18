import { A, useLocation, useNavigate, useParams } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { eye, eyeSlash, plus, xMark } from 'solid-heroicons/outline';
import { createEffect, createResource, createSignal, For, Show, Suspense } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { defaultTabs } from 'solid-repl/src';
import { API, useAppContext } from '../context';
import { decompressFromURL } from '@amoutonbrady/lz-string';
import { Header } from '../components/header';
import { timeAgo } from '../utils/date';

function parseHash<T>(hash: string, fallback: T): T {
  try {
    return JSON.parse(decompressFromURL(hash) || '');
  } catch {
    return fallback;
  }
}

interface ReplFile {
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
interface Repls {
  total: number;
  list: APIRepl[];
}

export const Home = () => {
  const params = useParams();
  const context = useAppContext()!;
  const navigate = useNavigate();
  const location = useLocation();

  createEffect(() => {
    if (location.query.hash) {
      navigate(`/anonymous/${location.query.hash}`);
    } else if (location.hash) {
      const initialTabs = parseHash(location.hash.slice(1), defaultTabs);
      localStorage.setItem(
        'scratchpad',
        JSON.stringify({
          files: initialTabs.map((x) => ({
            name: x.name,
            content: x.source,
          })),
        }),
      );
      navigate(`/scratchpad`);
    } else if (!context.token && !params.user) {
      navigate(`/scratchpad`);
    }
  });

  const [repls, setRepls] = createStore<Repls>({ total: 0, list: [] });
  const [resourceRepls] = createResource<Repls, { user: string }>(
    () => ({ user: params.user }),
    async ({ user }) => {
      if (!user && !context.token) return { total: 0, list: [] };
      let output = await fetch(`${API}/repl${user ? `/${user}/list` : '?'}`, {
        headers: {
          Authorization: `Bearer ${context.token}`,
        },
      }).then((r) => r.json());
      setRepls(output);
      return output;
    },
  );
  const get = <T,>(x: T) => {
    resourceRepls();
    return x;
  };

  const [open, setOpen] = createSignal<string>();

  return (
    <>
      <Header
        share={async () => {
          const url = new URL(document.location.origin);
          url.pathname = params.user || context.user.latest!.display;
          return url.toString();
        }}
      />
      <div class="m-8">
        <Show when={!params.user} fallback={<h1 class="mb-4 text-center text-3xl">{`${params.user}'s`} Repls</h1>}>
          <div class="mb-8 flex flex-col align-middle">
            <button
              class="bg-solid-lightgray mx-auto flex items-center justify-center rounded-xl border border-gray-600 p-3 text-xl shadow-md dark:bg-neutral-800"
              onClick={async () => {
                const result = await fetch(`${API}/repl`, {
                  method: 'POST',
                  headers: {
                    'authorization': `Bearer ${context.token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    title: 'Counter Example',
                    public: true,
                    labels: [],
                    version: '1.0',
                    files: defaultTabs.map((x) => ({ name: x.name, content: x.source })),
                  }),
                });
                if (!result.ok) {
                  alert('Failed to create repl');
                  throw new Error(result.statusText);
                }
                const { id } = await result.json();
                navigate(`/${context.user()?.display}/${id}`);
              }}
            >
              <Icon path={plus} class="w-6" /> Create new REPL
            </button>
            <p class="pt-1 text-center text-sm text-gray-800 dark:text-gray-300">
              or{' '}
              <A href="/scratchpad" class="text-solid-medium dark:text-solid-darkdefault hover:underline">
                open my scratchpad
              </A>
            </p>
          </div>
        </Show>
        <table class="w-200 mx-auto max-w-full">
          <thead>
            <tr class="border-b border-neutral-600 font-medium">
              <th class="w-1/2 p-1 text-left">Title</th>
              <th class="w-32 p-1 text-left last:text-right">Edited</th>
              <Show when={!params.user}>
                <th class="w-20 p-1 text-right">Options</th>
              </Show>
            </tr>
          </thead>
          <tbody>
            <tr class="h-1" aria-hidden />
            <Suspense
              fallback={
                <tr class="h-10">
                  <td colspan="3" class="text-center">
                    <svg
                      class="mx-auto mt-8 h-8 w-8 animate-spin text-white"
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
                  </td>
                </tr>
              }
            >
              <For each={get(repls.list)}>
                {(repl, i) => (
                  <tr
                    class="hover:bg-gray-400/10"
                    onclick={(e) => {
                      if (e.target.tagName !== 'A') e.currentTarget.querySelector('a')!.click();
                    }}
                  >
                    <td class="p-1">
                      <A href={`${params.user || context.user()?.display}/${repl.id}`}>{repl.title}</A>
                    </td>
                    <td class="p-1 last:text-right">
                      {timeAgo(Date.now() - new Date(repl.updated_at || repl.created_at).getTime())}
                    </td>
                    <Show when={!params.user}>
                      <td class="space-x-1 p-1 pr-0 text-right">
                        <Icon
                          path={repl.public ? eye : eyeSlash}
                          class="inline w-6 cursor-pointer"
                          onClick={async (e) => {
                            e.stopPropagation();
                            fetch(`${API}/repl/${repl.id}`, {
                              method: 'PATCH',
                              headers: {
                                'authorization': `Bearer ${context.token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                public: !repl.public,
                              }),
                            });
                            setRepls(
                              produce((x) => {
                                x!.list[i()].public = !repl.public;
                              }),
                            );
                          }}
                        />
                        <Icon
                          path={xMark}
                          class="inline w-6 cursor-pointer text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(repl.id);
                          }}
                        />
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </Suspense>
          </tbody>
        </table>
      </div>
      <Show when={!!open()}>
        <div
          class="fixed left-0 top-0 z-10 flex h-full w-full items-center justify-center bg-gray-500/50"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            setOpen(undefined);
          }}
          role="presentation"
        >
          <div
            class="dark:bg-solid-darkbg w-96 rounded-lg bg-white p-4 shadow dark:text-white"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <p>Are you sure you want to delete that?</p>
            <div class="mt-2 flex justify-end gap-2">
              <button
                class="rounded border px-2 py-1"
                onclick={() => {
                  fetch(`${API}/repl/${open()}`, {
                    method: 'DELETE',
                    headers: {
                      authorization: `Bearer ${context.token}`,
                    },
                  });
                  setRepls({
                    total: repls.total - 1,
                    list: repls.list.filter((x) => x.id !== open()),
                  });
                  setOpen(undefined);
                }}
              >
                Yes
              </button>
              <button class="rounded border px-2 py-1" onClick={() => setOpen(undefined)}>
                No
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
