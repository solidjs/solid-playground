import { useParams } from '@solidjs/router';
import { createSignal, createStore, For, Loading, Show } from 'solid-js';
import { Icon, Button, useDialog } from 'solid-repl/src/internal';
import { eye, eyeSlash, plus, xMark } from '../icons';
import { API, useAppContext } from '../context';
import { Header } from '../components/header';
import { Spinner } from '../components/spinner';
import { timeAgo } from '../utils/date';
import { css } from 'styled-system/css';

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

const newReplLink = css({
  mx: 'auto',
  display: 'flex',
  alignItems: 'center',
  px: 4,
  py: 3,
  rounded: 'lg',
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'neutral.200',
  fontSize: 'sm',
  _hover: { bg: 'neutral.300' },
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900', _hover: { bg: 'neutral.800' } },
});

const tableStyles = css({
  width: '50rem',
  maxW: 'full',
  mx: 'auto',
  fontSize: 'sm',
  borderCollapse: 'separate',
  borderSpacing: 0,
});

const headerCell = css({
  px: 3,
  py: 2,
  textAlign: 'left',
  borderBottomWidth: '1px',
  borderColor: 'neutral.200',
  _dark: { borderColor: 'neutral.700' },
});

const cell = css({
  px: 3,
  py: 2,
  _groupHover: { bg: 'neutral.200' },
  _firstOfType: { roundedLeft: 'lg' },
  _lastOfType: { roundedRight: 'lg' },
  _darkGroupHover: { bg: 'neutral.800' },
});

const dialogActions = css({ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 });

export const Home = () => {
  const params = useParams();
  const context = useAppContext();

  const [repls, setRepls] = createStore<Repls>(
    async () => {
      const user = params.user;
      const token = context.token;
      if (!user && !token) return { total: 0, list: [] };
      const res = await fetch(`${API}/repl${user ? `/${user}/list` : '?'}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load repls: ${res.status} ${res.statusText}`);
      const body = (await res.json()) as Repls;
      if (!Array.isArray(body?.list)) throw new Error('Failed to load repls: unexpected response');
      return body;
    },
    { total: 0, list: [] },
  );

  const [deleteId, setDeleteId] = createSignal<string>();
  const deleteDialog = useDialog({
    open: () => !!deleteId(),
    onOpenChange: (open) => {
      if (!open) setDeleteId(undefined);
    },
  });

  return (
    <>
      <Header
        share={async () => {
          const url = new URL(document.location.origin);
          url.pathname = `/${params.user || context.profile()}`;
          return url.toString();
        }}
      />
      <div class={css({ m: 8 })}>
        <Show
          when={params.user === context.profile()}
          fallback={<h1 class={css({ mb: 4, textAlign: 'center', fontSize: 'sm' })}>{`${params.user}'s`} Repls</h1>}
        >
          <div class={css({ mb: 8, display: 'flex', flexDirection: 'column', alignItems: 'stretch' })}>
            <a href="/" class={newReplLink}>
              <Icon path={plus} class={css({ mr: 1, w: 6 })} /> Create new REPL
            </a>
          </div>
        </Show>
        <table class={tableStyles}>
          <thead>
            <tr class={css({ fontWeight: 'medium' })}>
              <th class={headerCell + ' ' + css({ width: '50%' })}>Title</th>
              <th class={headerCell + ' ' + css({ width: 32 })}>Edited</th>
              <Show when={params.user === context.profile()}>
                <th class={headerCell + ' ' + css({ width: 20, textAlign: 'right' })}>Options</th>
              </Show>
            </tr>
          </thead>
          <tbody>
            <tr class={css({ h: 1 })} aria-hidden="true" />
            <Loading
              fallback={
                <tr class={css({ h: 10 })}>
                  <td colspan="3" class={css({ textAlign: 'center' })}>
                    <Spinner class={css({ mx: 'auto', mt: 8, h: 8, w: 8 })} />
                  </td>
                </tr>
              }
            >
              <For each={repls.list}>
                {(repl, i) => (
                  <tr
                    class={css({ cursor: 'pointer' }) + ' group'}
                    onClick={(e) => {
                      if (e.target.tagName !== 'A') e.currentTarget.querySelector('a')!.click();
                    }}
                  >
                    <td class={cell}>
                      <a href={`/${params.user || context.profile()}/${repl.id}`}>{repl.title}</a>
                    </td>
                    <td class={cell + ' ' + css({ _lastOfType: { textAlign: 'right' } })}>
                      {timeAgo(Date.now() - new Date(repl.updated_at || repl.created_at).getTime())}
                    </td>
                    <Show when={params.user === context.profile()}>
                      <td class={cell + ' ' + css({ display: 'flex', justifyContent: 'flex-end', gap: 1 })}>
                        <Icon
                          path={repl.public ? eye : eyeSlash}
                          class={css({ display: 'inline', w: 6, cursor: 'pointer' })}
                          onClick={async (e) => {
                            e.stopPropagation();
                            void fetch(`${API}/repl/${repl.id}`, {
                              method: 'PATCH',
                              headers: {
                                'authorization': `Bearer ${context.token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ public: !repl.public }),
                            });
                            setRepls((x) => {
                              x.list[i()].public = !repl.public;
                            });
                          }}
                        />
                        <Icon
                          path={xMark}
                          class={css({ display: 'inline', w: 6, color: 'red.700', cursor: 'pointer' })}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(repl.id);
                          }}
                        />
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </Loading>
          </tbody>
        </table>
      </div>
      <deleteDialog.Root>
        <p>Are you sure you want to delete that?</p>
        <div class={dialogActions}>
          <Button onClick={() => setDeleteId(undefined)}>No</Button>
          <Button
            class={css({ color: 'red.700', _dark: { color: 'red.400' } })}
            onClick={() => {
              const id = deleteId();
              if (!id) return;
              void fetch(`${API}/repl/${id}`, {
                method: 'DELETE',
                headers: { authorization: `Bearer ${context.token}` },
              });
              setRepls((x) => ({ total: x.total - 1, list: x.list.filter((r) => r.id !== id) }));
              setDeleteId(undefined);
            }}
          >
            Delete
          </Button>
        </div>
      </deleteDialog.Root>
    </>
  );
};
