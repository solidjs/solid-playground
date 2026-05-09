import { A, useParams } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { eye, eyeSlash, plus, xMark } from 'solid-heroicons/outline';
import { createResource, createSignal, For, Show, Suspense } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { API, useAppContext } from '../context';
import { Header } from '../components/header';
import { timeAgo } from '../utils/date';
import { Button } from 'solid-repl/src/components/ui/Button';
import type { SolidVersion } from 'solid-repl';

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
  solidVersion?: SolidVersion;
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

  const [repls, setRepls] = createStore<Repls>({ total: 0, list: [] });
  const [resourceRepls] = createResource<Repls, { user: string | undefined }>(
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
          url.pathname = `/${params.user || context.profile()}`;
          return url.toString();
        }}
      />
      <div class="m-8">
        <Show
          when={params.user === context.profile()}
          fallback={<h1 class="mb-4 text-center text-sm">{`${params.user}'s`} Repls</h1>}
        >
          <div class="mb-8 flex flex-col align-middle">
            <A
              href="/"
              class="border-neutral-200 px-4 py-3 hover:bg-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-800 bg-neutral-200 dark:bg-neutral-900 mx-auto flex items-center rounded-lg border text-sm"
            >
              <Icon path={plus} class="mr-1 w-6" /> Create new REPL
            </A>
          </div>
        </Show>
        <table class="w-200 max-w-full border-spacing-0 mx-auto border-separate text-sm">
          <thead>
            <tr class="font-medium">
              <th class="w-1/2 border-neutral-200 px-3 py-2 dark:border-neutral-700 border-b text-left">Title</th>
              <th class="w-32 border-neutral-200 px-3 py-2 dark:border-neutral-700 border-b text-left last:text-right">
                Edited
              </th>
              <Show when={params.user === context.profile()}>
                <th class="w-20 border-neutral-200 px-3 py-2 dark:border-neutral-700 border-b text-right">Options</th>
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
                      class="mt-8 h-8 w-8 animate-spin text-neutral-500 mx-auto"
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
                    class="group cursor-pointer"
                    onclick={(e) => {
                      if (e.target.tagName !== 'A') e.currentTarget.querySelector('a')!.click();
                    }}
                  >
                    <td class="px-3 py-2 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 first:rounded-l-lg last:rounded-r-lg">
                      <A href={`/${params.user || context.profile()}/${repl.id}`}>{repl.title}</A>
                    </td>
                    <td class="px-3 py-2 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 first:rounded-l-lg last:rounded-r-lg last:text-right">
                      {timeAgo(Date.now() - new Date(repl.updated_at || repl.created_at).getTime())}
                    </td>
                    <Show when={params.user === context.profile()}>
                      <td class="space-x-1 px-3 py-2 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 text-right first:rounded-l-lg last:rounded-r-lg">
                        <Icon
                          path={repl.public ? eye : eyeSlash}
                          class="w-6 inline cursor-pointer"
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
                          class="w-6 text-red-700 inline cursor-pointer"
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
          class="top-0 left-0 z-10 h-full w-full bg-black/50 fixed flex items-center justify-center"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            setOpen(undefined);
          }}
          role="presentation"
        >
          <div
            class="w-96 border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:text-white dark:bg-neutral-900 rounded-lg border shadow-lg"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
          >
            <p>Are you sure you want to delete that?</p>
            <div class="mt-3 gap-2 flex justify-end">
              <Button onClick={() => setOpen(undefined)}>No</Button>
              <Button
                class="text-red-700 dark:text-red-400"
                onClick={() => {
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
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
