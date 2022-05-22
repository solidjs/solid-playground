import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import CompilerWorker from '../../src/workers/compiler?worker';
import FormatterWorker from '../../src/workers/formatter?worker';
import {
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
import createDebounce from '@solid-primitives/debounce';
import type { Tab } from '../../src';
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

// Custom version of createTabList that allows us to use a resource as the backing signal
const createTabList = () => {
  let sourceSignals: Record<string, [get: () => string, set: (value: string) => string]> = {};

  const mapTabs = (tabs: Tab[]): Tab[] => {
    const oldSignals = sourceSignals;
    sourceSignals = {};

    return tabs.map((tab) => {
      const id = `${tab.name}.${tab.type}`;
      sourceSignals[id] = oldSignals[id] || createSignal(tab.source);
      if (oldSignals[id]) oldSignals[id][1](tab.source);

      return {
        name: tab.name,
        type: tab.type,
        get source() {
          return sourceSignals[id][0]();
        },
        set source(source: string) {
          sourceSignals[id][1](source);
        },
      };
    });
  };

  return mapTabs;
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

export const Edit = (props: { dark: boolean; horizontal: boolean }) => {
  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();

  const params = useParams();
  const context = useAppContext()!;

  const tabMapper = (tabs: Tab[]) => tabs.map((x) => ({ name: `${x.name}.${x.type}`, content: x.source.split('\n') }));
  const mapTabs = createTabList();
  const [resource, { mutate }] = createResource<{ tabs: Tab[]; repl: APIRepl }, string>(params.repl, async (repl) => {
    let x: APIRepl = await fetch(`${API}/repl/${repl}`, {
      headers: { authorization: `Bearer ${context.token}` },
    }).then((r) => r.json());

    return {
      repl: x,
      tabs: mapTabs(
        x.files.map((x) => {
          let dot = x.name.lastIndexOf('.');
          return { name: x.name.slice(0, dot), type: x.name.slice(dot + 1), source: x.content.join('\n') };
        }),
      ),
    };
  });

  const [current, setCurrent] = createSignal<string>();
  createEffect(() => {
    const myRepl = resource();
    if (!myRepl) return;
    setCurrent(`${myRepl.tabs[0].name}.${myRepl.tabs[0].type}`);
  });

  const tabs = () => resource()?.tabs || [];
  const setTabs = (tabs: Tab[]) => {
    if (resource.latest) mutate({ repl: resource.latest.repl, tabs: mapTabs(tabs) });
  };

  const updateRepl = createDebounce(() => {
    const repl = resource();
    if (!repl) return;
    const tabs = tabMapper(repl.tabs);
    fetch(`${API}/repl/${params.repl}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${context.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: repl.repl.title,
        version: repl.repl.version,
        public: repl.repl.public,
        labels: repl.repl.labels,
        files: tabs,
      }),
    });
  }, 1000);

  let firstRun = true;
  createEffect(() => {
    tabMapper(tabs()); // use the latest value on debounce, and just throw this value away (but use it to track)
    if (firstRun) firstRun = false;
    else updateRepl();
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
        dark={props.dark}
        tabs={tabs()}
        setTabs={setTabs}
        current={current()}
        setCurrent={setCurrent}
        id="repl"
      />
      <RenderHeader>
        <input class="bg-transparent" value={resource()?.repl?.title || ''} />
      </RenderHeader>
    </Suspense>
  );
};
