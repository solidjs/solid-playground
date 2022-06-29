import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import CompilerWorker from '../../src/workers/compiler?worker';
import FormatterWorker from '../../src/workers/formatter?worker';
import {
  batch,
  createEffect,
  createResource,
  createSignal,
  lazy,
  onCleanup,
  onMount,
  ParentComponent,
  Suspense,
} from 'solid-js';
import { useParams } from 'solid-app-router';
import { API, useAppContext } from '../context';
import { debounce } from '@solid-primitives/scheduled';
import { createTabList, Tab } from '../../src';
import type { APIRepl } from './home';

const Repl = lazy(() => import('../../src/components/repl'));

(window as any).MonacoEnvironment = {
  getWorker(_moduleId: unknown, label: string) {
    switch (label) {
      case 'css':
        return new cssWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

const RenderHeader: ParentComponent = (props) => {
  onMount(() => {
    const projectName = document.getElementById('project-name')!;
    const content = projectName.firstChild!;
    content.remove();
    const children = props.children as HTMLElement;
    projectName.appendChild(children);
    onCleanup(() => {
      projectName.appendChild(content);
      projectName.removeChild(children);
    });
  });
  return <></>;
};

export const Edit = (props: { horizontal: boolean }) => {
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();

  const params = useParams();
  const context = useAppContext()!;

  let loaded = false;

  const [tabs, setTabs] = createTabList([]);
  context.setTabs(tabs);
  const [current, setCurrent] = createSignal<string>();
  const [resource, { mutate }] = createResource<APIRepl, string>(params.repl, async (repl) => {
    let output: APIRepl;
    if (params.user == 'local') {
      output = JSON.parse(localStorage.getItem(repl)!);
    } else {
      output = await fetch(`${API}/repl/${repl}`, {
        headers: { authorization: context.token ? `Bearer ${context.token}` : '' },
      }).then((r) => r.json());
    }

    batch(() => {
      setTabs(
        output.files.map((x) => {
          return { name: x.name, source: x.content.join('\n') };
        }),
      );
      setCurrent(output.files[0].name);
    });
    loaded = true;

    return output;
  });

  const tabMapper = (tabs: Tab[]) => tabs.map((x) => ({ name: x.name, content: x.source.split('\n') }));
  const updateRepl = debounce(
    () => {
      const repl = resource.latest;
      if (!repl) return;
      const files = tabMapper(tabs());
      if (params.user == 'local') {
        localStorage.setItem(
          params.repl,
          JSON.stringify({
            title: repl.title,
            version: repl.version,
            public: repl.public,
            labels: repl.labels,
            files,
          }),
        );
        return;
      }
      if (!context.token || context.user()?.display != params.user) return;
      fetch(`${API}/repl/${params.repl}`, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: repl.title,
          version: repl.version,
          public: repl.public,
          labels: repl.labels,
          files,
        }),
      });
    },
    params.user == 'local' ? 10 : 1000,
  );

  createEffect(() => {
    tabMapper(tabs()); // use the latest value on debounce, and just throw this value away (but use it to track)
    resource();
    if (loaded) updateRepl();
  });

  return (
    <Suspense
      fallback={
        <svg
          class="animate-spin h-12 w-12 text-white m-auto"
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
      <Repl
        compiler={compiler}
        formatter={formatter}
        isHorizontal={props.horizontal}
        dark={context.dark()}
        tabs={tabs()}
        setTabs={setTabs}
        current={current()}
        setCurrent={setCurrent}
        id="repl"
      />
      <RenderHeader>
        <input
          class="bg-transparent"
          value={resource()?.title || ''}
          onChange={(e) => {
            mutate((x) => x && { ...x, title: e.currentTarget.value });
          }}
        />
      </RenderHeader>
    </Suspense>
  );
};
