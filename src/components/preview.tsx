import {
  Component,
  createEffect,
  createSignal,
  splitProps,
  JSX,
  For,
  Show,
  onMount,
} from 'solid-js';
import { Icon } from 'solid-heroicons';
import { chevronDown, chevronRight } from 'solid-heroicons/solid';
import useZoom from '../hooks/useZoom';

export const Preview: Component<Props> = (props) => {
  const { zoomState } = useZoom();
  const [internal, external] = splitProps(props, ['code', 'isDark', 'class', 'reloadSignal']);

  let iframe!: HTMLIFrameElement;

  const [showLogs, setShowLogs] = createSignal(false);
  const [logs, setLogs] = createSignal<LogPayload[]>([]);
  const [isIframeReady, setIframeReady] = createSignal(false);

  let latestCode: string;
  const CODE_UPDATE = 'CODE_UPDATE';

  createEffect(() => {
    // HACK: This helps prevent unnecessary updates
    const isNotDom =
      internal.code.includes('getNextElement') || internal.code.includes('getHydrationKey');

    const isEmpty = !internal.code;

    if (isNotDom || isEmpty || !isIframeReady()) return;
    // Clear logs on every playground changes
    setLogs([]);

    latestCode = internal.code.replace('render(', 'window.dispose = render(');
    iframe.contentWindow!.postMessage({ event: CODE_UPDATE, code: latestCode }, '*');
  });

  const setDarkMode = () => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    doc?.body!.classList.toggle('dark', internal.isDark);
  };

  createEffect(() => {
    if (iframe && isIframeReady()) {
      setDarkMode();
    }
  });

  function attachToIframe() {
    setIframeReady(true);

    iframe.contentWindow!.addEventListener('message', ({ data }) => {
      if (data.event === 'LOG') {
        const { level, args } = data;
        setLogs([...logs(), { level, args }]);
      }
    });

    setDarkMode();
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <!-- Ressource hints -->
        <link rel="dns-prefetch" href="//unpkg.com">
        <link href="https://unpkg.com" rel="preconnect" crossorigin>
        <link rel="preload" href="https://unpkg.com/modern-normalize@1.1.0/modern-normalize.css" as="style">
        <link href="https://unpkg.com/modern-normalize@1.1.0/modern-normalize.css" rel="stylesheet">

        <style>
          html, body {
            position: relative;
            width: 100%;
            height: 100%;
          }

          body {
            color: #333;
            margin: 0;
            padding: 8px;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            max-width: 100%;
          }

          .dark {
            color: #e5e7eb;
          }

          input, button, select, textarea {
            padding: 0.4em;
            margin: 0 0 0.5em 0;
            box-sizing: border-box;
            border: 1px solid #ccc;
            border-radius: 2px;
          }

          button {
            color: #333;
            background-color: #f4f4f4;
            outline: none;
          }

          button:disabled {
            color: #999;
          }

          button:not(:disabled):active {
            background-color: #ddd;
          }

          button:focus {
            border-color: #666;
          }
		    </style>

        <script type="module" id="setup">
          const fakeConsole = {};

          function formatArgs(args) {
            const untrack = window.$$untrack || ((fn) => fn());
            return untrack(() =>
              args
                .map((arg) => {
                  if (arg instanceof Element) {
                    return arg.outerHTML;
                  } else if (typeof arg === 'object' && arg !== null) {
                    const traversed = new Set();
                    return JSON.stringify(
                      arg,
                      (_, v) => {
                        if (typeof v === 'object' && v !== null) {
                          if (traversed.has(v)) {
                            return '[circular object]';
                          }
                          traversed.add(v);
                          return v;
                        } else if (typeof v === 'bigint') {
                          return v.toString();
                        }
                        return v;
                      },
                      2,
                    );
                  }
                  return '"' + String(arg) + '"';
                })
                .join(' '),
            );
          }

          
          for (const level of ['log', 'error', 'warn']) {
            fakeConsole[level] = console[level];

            console[level] = (...args) => {
              fakeConsole[level](...args);
              window.postMessage({ event: 'LOG', level, args: formatArgs(args) }, '*');
            }
          }

          window.addEventListener('message', ({ data }) => {
            try {
              const { event, code } = data;

              if (event !== 'CODE_UPDATE') return;

              window?.dispose?.();
              window.dispose = undefined;

              let app = document.getElementById('app');
              if (app) {
                app.remove();
                app = document.createElement('div');
                app.id = 'app';
                document.body.prepend(app);
              }

              const encodedCode = encodeURIComponent(code);
              const dataUri = 'data:text/javascript;charset=utf-8,' + encodedCode;
              import(dataUri);
  
              const load = document.getElementById('load');
              if (code && load) load.remove();
            } catch (e) {
              console.error(e)
            }
          })
        </script>
      </head>
      
      <body class="dark">
        <div id="load" style="display: flex; height: 80vh; align-items: center; justify-content: center;">
          <p style="font-size: 1.5rem">Loading the playground...</p>
        </div>
        <div id="app"></div>
      </body>
    </html>
  `;

  createEffect(() => {
    // Bail early on first mount or we are already reloading
    if (!internal.reloadSignal) return;

    // Otherwise, reload everytime we clicked the reload button
    setIframeReady(false);
    iframe.srcdoc = html;
  });

  const styleScale = () => {
    if (zoomState.scale === 100 || !zoomState.scaleIframe) return '';

    return `width: ${zoomState.scale}%; height: ${zoomState.scale}%; transform: scale(${
      zoomState.zoom / 100
    }); transform-origin: 0 0;`;
  };

  onMount(() => {
    iframe.srcdoc = html;
    iframe.addEventListener('load', attachToIframe);
  });

  return (
    <div
      class={`grid relative ${internal.class}`}
      {...external}
      style={`grid-template-rows: 1fr auto; ${styleScale()}`}
    >
      <iframe
        title="Solid REPL"
        class="overflow-auto p-0 w-full h-full dark:bg-other block"
        ref={iframe}
        // @ts-ignore
        sandbox="allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals allow-same-origin"
      ></iframe>

      <div
        class="grid border-t-2 border-slate-200 dark:border-slate-700 border-solid dark:bg-solid-darkLighterBg text-slate-600 dark:text-gray-200"
        style={{ 'grid-template-rows': `1fr ${showLogs() ? 'minmax(auto, 20vh)' : '0px'}` }}
      >
        <div class="flex justify-between items-center w-full">
          <button
            type="button"
            class="relative text-left text-xs md:text-sm p-2 focus:outline-none -mb-1 md:-mb-0.5 leading-none md:leading-tight flex items-center"
            onClick={() => setShowLogs(!showLogs())}
          >
            <Icon class="h-7" path={showLogs() ? chevronDown : chevronRight} />
            <span>Console ({logs().length})</span>
          </button>

          <button
            type="button"
            class="text-xs md:text-sm p-2 focus:outline-none -mb-1 md:-mb-0.5 leading-none md:leading-tight hover:text-slate-800 dark:hover:text-slate-200"
            onClick={[setLogs, []]}
          >
            Clear
          </button>
        </div>

        <Show when={showLogs()}>
          <ul class="text-xs overflow-auto px-2 divide-y dark:divide-slate-300">
            <For each={logs()}>
              {(log) => (
                <li
                  class="py-1"
                  classList={{
                    'text-blue-700 dark:text-gray-300': log.level === 'log',
                    'text-yellow-500': log.level === 'warn',
                    'text-red-700 dark:text-red-300': log.level === 'error',
                  }}
                >
                  <code class="whitespace-pre-wrap">{log.args}</code>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </div>
  );
};

type Props = JSX.HTMLAttributes<HTMLDivElement> & {
  code: string;
  reloadSignal: boolean;
  isDark: boolean;
};

interface LogPayload {
  level: 'log' | 'warn' | 'error';
  args: string;
}
