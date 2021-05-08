import { Component, createEffect, createSignal, splitProps, JSX, For, Show } from 'solid-js';
import { Icon } from '@amoutonbrady/solid-heroicons';
import { chevronDown, chevronRight } from '@amoutonbrady/solid-heroicons/solid';

export const Preview: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ['code', 'class']);

  let iframe!: HTMLIFrameElement;

  const [showLogs, setShowLogs] = createSignal(false);
  const [logs, setLogs] = createSignal<LogPayload[]>([]);
  const [isIframeReady, setIframeReady] = createSignal(false);

  createEffect(() => {
    // HACK: This helps prevent unnecessary updates
    const isNotDom =
      internal.code.includes('getNextElement') || internal.code.includes('getHydrationKey');

    const isEmpty = !internal.code;

    if (isNotDom || isEmpty || !isIframeReady()) return;

    const code = internal.code.replace('render(', 'window.dispose = render(');
    const event = 'CODE_UPDATE';

    iframe.contentWindow!.postMessage({ event, code }, '*');
  });

  function attachToIframe() {
    setIframeReady(true);

    iframe.contentWindow!.addEventListener('message', ({ data }) => {
      switch (data.event) {
        case 'LOG':
          const { level, args } = data;
          setLogs([...logs(), { level, args }]);
          break;
      }
    });
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
        <link rel="preload" href="https://unpkg.com/@tailwindcss/typography@0.3.1/dist/typography.min.css" as="style">

        <link href="https://unpkg.com/@tailwindcss/typography@0.3.1/dist/typography.min.css" rel="stylesheet">

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

        <script type="module">
          const fakeConsole = {};

          function formatArgs(args) {
            return args
              .map((arg) =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
              )
              .join(', ')
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
  
              const oldScript = document.getElementById('script');
              if (oldScript) oldScript.remove();
  
              window.dispose && typeof window.dispose === 'function' && window.dispose()
  
              if (!document.getElementById('app')) {
                const app = document.createElement('div');
                app.id = 'app';
                document.body.appendChild(app);
              }
  
              const script = document.createElement('script');
              script.innerHTML = code;
              script.type = 'module';
              script.id = 'script';
  
              document.body.appendChild(script);
  
              const load = document.getElementById('load');
              if (code && load) load.remove();
            } catch (e) {
              console.error(e)
            }
          })
        </script>

        <style>
          body {
            max-width: 100%;
          }
        </style>
      </head>
      <body class="prose">
        <div id="load" style="display: flex; height: 80vh; align-items: center; justify-content: center;">
          <p style="font-size: 1.5rem">Loading the playground...</p>
        </div>
      </body>
    </html>
  `;

  return (
    <div
      class={`grid relative ${internal.class}`}
      {...external}
      style="grid-template-rows: 1fr auto"
    >
      <iframe
        class="overflow-auto p-2 w-full h-full dark:bg-other"
        ref={iframe}
        srcdoc={html}
        onLoad={attachToIframe}
        // @ts-ignore
        sandbox="allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals allow-same-origin"
      ></iframe>

      <div
        class="grid border-t-2 border-blueGray-200 dark:border-blueGray-700 border-solid dark:bg-blueGray-800 text-blueGray-600 dark:text-gray-300"
        style={{ 'grid-template-rows': `1fr ${showLogs() ? 'minmax(auto, 20vh)' : '0px'}` }}
      >
        <div class="flex justify-between items-start w-full">
          <button
            type="button"
            class="relative text-left font-semibold uppercase text-xs md:text-sm px-2 py-3 focus:outline-none -mb-1 md:-mb-0.5 leading-none md:leading-tight"
            onClick={() => setShowLogs(!showLogs())}
          >
            <Icon
              class="h-[28px] absolute top-[7px] left-[2px]"
              path={showLogs() ? chevronDown : chevronRight}
            />
            <span class="ml-4">Console ({logs().length})</span>
          </button>
          <button
            type="button"
            class="uppercase text-xs md:text-sm px-2 py-3 focus:outline-none -mb-1 md:-mb-0.5 leading-none md:leading-tight hover:text-blueGray-800"
            onClick={[setLogs, []]}
          >
            Clear
          </button>
        </div>

        <Show when={showLogs()}>
          <ul class="text-xs overflow-auto px-2 divide-y">
            <For each={logs()}>
              {(log) => (
                <li
                  class="py-1"
                  classList={{
                    'text-blue-700': log.level === 'log',
                    'text-yello-700': log.level === 'warn',
                    'text-red-700': log.level === 'error',
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

interface Props extends JSX.HTMLAttributes<HTMLIFrameElement> {
  code: string;
}

interface LogPayload {
  level: 'log' | 'warn' | 'error';
  args: string;
}
