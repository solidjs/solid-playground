import { useLocation, useNavigate, useParams } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { eye, eyeOff, plus, x } from 'solid-heroicons/outline';
import { createEffect, createResource, createSignal, For, Show, Suspense } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { defaultTabs } from '../../src';
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
        <Show when={!params.user} fallback={<h1 class="text-center text-3xl mb-4">{`${params.user}'s`} Repls</h1>}>
          <div class="flex flex-col align-middle mb-8">
            <button
              class="bg-solid-lightgray shadow-md dark:bg-neutral-800 border border-gray-600 rounded-xl p-3 text-xl flex mx-auto justify-center items-center"
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
            <p class="text-center text-gray-800 dark:text-gray-300 text-sm pt-1">
              or{' '}
              <a href="/scratchpad" class="hover:underline text-solid-medium dark:text-solid-darkdefault">
                open my scratchpad
              </a>
            </p>
          </div>
        </Show>
        <table class="w-200 max-w-full mx-auto">
          <thead>
            <tr class="border-b border-neutral-600 font-medium">
              <th class="pb-2 w-6/10 text-left">Title</th>
              <th class="pb-2 w-32 text-left last:text-right">Edited</th>
              <Show when={!params.user}>
                <th class="pb-2 w-20 text-right">Options</th>
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
                      class="animate-spin h-8 w-8 text-white mx-auto mt-8"
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
                  <tr>
                    <td class="p-0">
                      <a href={`${params.user || context.user()?.display}/${repl.id}`}>{repl.title}</a>
                    </td>
                    <td class="p-0 last:text-right">
                      {timeAgo(Date.now() - new Date(repl.updated_at || repl.created_at).getTime())}
                    </td>
                    <Show when={!params.user}>
                      <td class="p-0 text-right">
                        <Icon
                          path={repl.public ? eye : eyeOff}
                          class="w-6 inline m-2 ml-0 cursor-pointer"
                          onClick={async () => {
                            fetch(`${API}/repl/${repl.id}`, {
                              method: 'PUT',
                              headers: {
                                'authorization': `Bearer ${context.token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                ...repl,
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
                          path={x}
                          class="w-6 inline m-2 mr-0 text-red-700 cursor-pointer"
                          onClick={() => {
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
          class="fixed z-10 top-0 left-0 w-full h-full flex justify-center items-center bg-gray-500/50"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            setOpen(undefined);
          }}
          role="presentation"
        >
          <div
            class="bg-white dark:bg-solid-darkbg dark:text-white p-4 rounded-lg shadow w-96"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <p>Are you sure you want to delete that?</p>
            <div class="flex justify-end gap-2 mt-2">
              <button
                class="py-1 px-2 rounded border"
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
              <button class="py-1 px-2 rounded border" onClick={() => setOpen(undefined)}>
                No
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
