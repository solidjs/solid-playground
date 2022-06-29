import { useLocation, useNavigate, useParams } from 'solid-app-router';
import { Icon } from 'solid-heroicons';
import { eye, eyeOff, plus, x } from 'solid-heroicons/outline';
import { createEffect, createResource, createSignal, For, Show, Suspense, untrack } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { defaultTabs } from '../../src';
import { API, useAppContext } from '../context';
import { decompressFromURL } from '@amoutonbrady/lz-string';

function parseHash<T>(hash: string, fallback: T): T {
  try {
    return JSON.parse(decompressFromURL(hash)!);
  } catch {
    return fallback;
  }
}

export interface ReplFile {
  name: string;
  content: string[];
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

const createLocalList = () => {
  const [localList, setLocalList] = createSignal<string[]>(JSON.parse(localStorage.getItem('repls') || '[]'));
  return [
    localList,
    (el: string[]) => {
      localStorage.setItem('repls', JSON.stringify(el));
      setLocalList(el);
    },
  ] as const;
};

export const Home = () => {
  const params = useParams();
  const context = useAppContext()!;
  const navigate = useNavigate();
  const location = useLocation();

  const [localList, setLocalList] = createLocalList();
  createEffect(() => {
    if (!location.hash) return;
    const initialTabs = parseHash(location.hash.slice(1), defaultTabs);
    let id = Math.floor(Date.now() / 1000).toString();
    localStorage.setItem(
      id,
      JSON.stringify({
        title: 'Unknown Repl',
        public: true,
        labels: [],
        version: '1.0',
        files: initialTabs.map((x) => ({
          name: x.name + ((x as any).type ? `.${(x as any).type}` : ''),
          content: x.source.split('\n'),
        })),
      }),
    );
    setLocalList([id, ...untrack(localList)]);
    navigate(`/local/${id}`);
  });

  const [repls, setRepls] = createStore<Repls>({ total: 0, list: [] });
  const [resourceRepls] = createResource<Repls, string>(
    () => params.user || context.user()?.display,
    async (user) => {
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

  return (
    <div class="m-8">
      <button
        class="bg-solid-lightgray shadow-md dark:bg-solid-darkLighterBg rounded-xl p-4 text-3xl flex mx-auto"
        onClick={async () => {
          if (!params.user && !context.user()?.display) {
            let id = Math.floor(Date.now() / 1000).toString();
            localStorage.setItem(
              id,
              JSON.stringify({
                title: 'Counter Example',
                public: true,
                labels: [],
                version: '1.0',
                files: defaultTabs.map((x) => ({ name: x.name, content: x.source.split('\n') })),
              }),
            );
            setLocalList([id, ...localList()]);
            navigate(`/local/${id}`);
            return;
          }
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
              files: defaultTabs.map((x) => ({ name: x.name, content: x.source.split('\n') })),
            }),
          });
          const { id } = await result.json();
          navigate(`/${context.user()?.display}/${id}`);
        }}
      >
        <Icon path={plus} class="w-8" />{' '}
        {params.user || context.user()?.display ? 'Create new REPL' : 'Create Anonymous REPL'}
      </button>

      <h1 class="text-center text-3xl mb-4 mt-16">{params.user || 'My'} Repls</h1>
      <table class="w-128 mx-auto">
        <thead>
          <tr class="border-b border-neutral-600">
            <td>Title</td>
            <td>Edited</td>
            <td>Options</td>
          </tr>
        </thead>
        <tbody>
          <Suspense
            fallback={
              <tr>
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
            <Show
              when={params.user || context.user()?.display}
              fallback={
                <For each={localList()}>
                  {(id) => {
                    let repl = JSON.parse(localStorage.getItem(id)!);

                    return (
                      <tr>
                        <td>
                          <a href={`/local/${id}`}>{repl.title}</a>
                        </td>
                        <td>{new Date(+id * 1000).toLocaleString()}</td>
                        <td>
                          <span title="Can't make local repl public, open the repl and click share link instead">
                            <Icon path={eyeOff} class="w-6 inline m-2 ml-0 cursor-not-allowed" />
                          </span>
                          <Icon
                            path={x}
                            class="w-6 inline m-2 mr-0 text-red-700 cursor-pointer"
                            onClick={() => {
                              localStorage.removeItem(id);
                              setLocalList(localList().filter((x) => x !== id));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  }}
                </For>
              }
            >
              <For each={get(repls.list)}>
                {(repl, i) => (
                  <tr>
                    <td>
                      <a href={`${params.user || context.user()?.display}/${repl.id}`}>{repl.title}</a>
                    </td>
                    <td>{new Date(repl.created_at).toLocaleString()}</td>
                    <td>
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
                        onClick={async () => {
                          fetch(`${API}/repl/${repl.id}`, {
                            method: 'DELETE',
                            headers: {
                              authorization: `Bearer ${context.token}`,
                            },
                          });
                          setRepls({
                            total: repls.total - 1,
                            list: repls.list.filter((x) => x.id !== repl.id),
                          });
                        }}
                      />
                    </td>
                  </tr>
                )}
              </For>
            </Show>
          </Suspense>
        </tbody>
      </table>
    </div>
  );
};
