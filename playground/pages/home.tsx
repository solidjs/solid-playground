import { useNavigate, useParams } from 'solid-app-router';
import { Icon } from 'solid-heroicons';
import { eye, eyeOff, plus, x } from 'solid-heroicons/outline';
import { createResource, For } from 'solid-js';
import { defaultTabs } from '../../src';
import { API, useAppContext } from '../context';

interface Repls {
  total: number;
  list: {
    id: string;
    title: string;
    labels: string[];
    files: unknown;
    version: string;
    public: boolean;
    size: number;
    created_at: string;
    updated_at?: string;
  }[];
}

export const Home = () => {
  const params = useParams();
  const context = useAppContext()!;
  const navigate = useNavigate();
  const user = () => params.user || context.user()?.display;

  const [repls] = createResource(user, async (user) => {
    if (!user) return { total: 0, list: [] };
    const result = await fetch(`${API}/repl/${user}/list`);
    return (await result.json()) as Repls;
  });

  return (
    <div class="bg-brand-other h-full m-8">
      <button
        class="bg-solid-lightgray shadow-md dark:bg-solid-darkLighterBg rounded-xl p-4 text-3xl flex mx-auto"
        onClick={async () => {
          const result = await fetch(`${API}/repl`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${context.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: 'Counter Example',
              public: true,
              labels: [],
              version: '1.0',
              files: defaultTabs.map((x) => ({ name: `${x.name}.${x.type}`, content: x.source.split('\n') })),
            }),
          });
          const { id } = await result.json();
          navigate(`/${context.user()?.display}/${id}`);
        }}
      >
        <Icon path={plus} class="w-8" /> Create new REPL
      </button>

      <table class="w-128 mx-auto my-8">
        <thead>
          <tr class="border-b border-neutral-600">
            <td>Title</td>
            <td>Edited</td>
            <td>Options</td>
          </tr>
        </thead>
        <tbody>
          <For each={repls()?.list}>
            {(repl) => (
              <tr>
                <td>
                  <a href={`${user()}/${repl.id}`}>{repl.title}</a>
                </td>
                <td>{new Date(repl.created_at).toLocaleString()}</td>
                <td>
                  <Icon path={repl.public ? eye : eyeOff} class="w-6 inline m-2 ml-0" />
                  <Icon path={x} class="w-6 inline m-2 mr-0 text-red-700" />
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};
