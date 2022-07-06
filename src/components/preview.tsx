import { Component, createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { useZoom } from '../hooks/useZoom';

export const Preview: Component<Props> = (props) => {
  const { zoomState } = useZoom();

  let iframe!: HTMLIFrameElement;

  const [isIframeReady, setIframeReady] = createSignal(false);

  let latestCode: string;
  const CODE_UPDATE = 'CODE_UPDATE';

  createEffect(() => {
    if (!props.code) return;
    if (!isIframeReady()) return;

    latestCode = props.code.replace('render(', 'window.dispose = render(');

    const blob = new Blob([latestCode], {
      type: 'text/javascript',
    });
    const src = URL.createObjectURL(blob);
    onCleanup(() => URL.revokeObjectURL(src));

    iframe.contentWindow!.postMessage({ event: CODE_UPDATE, value: src }, '*');
  });

  createEffect(() => {
    iframe.contentWindow!.postMessage({ event: 'DEVTOOLS', value: props.devtools }, '*');
  });

  const setDarkMode = () => {
    const doc = iframe.contentDocument!.body;
    doc.classList.toggle('dark', props.isDark);
    iframe.contentWindow!.postMessage({ event: 'THEME', value: props.isDark }, '*');
  };

  createEffect(() => {
    if (isIframeReady()) setDarkMode();
  });

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <!-- Ressource hints -->
        <link rel="dns-prefetch" href="https://unpkg.com">
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

        <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
        <script src="https://cdn.jsdelivr.net/npm/eruda-dom"></script>
        <script type="module">
          eruda.init({
            tool: ["console", "network", "resources", "elements"],
            defaults: {
              displaySize: 40,
              theme: "${props.isDark ? 'Dark' : 'Light'}"
            }
          });
          eruda.add(erudaDom);
          eruda.position({ x: window.innerWidth - 30, y: window.innerHeight - 30 });
          const style = Object.assign(document.createElement('link'), {
            rel: 'stylesheet',
            href: '${location.origin}/eruda.css'
          });
          eruda._shadowRoot.appendChild(style);
          ${props.devtools ? 'eruda.show();' : ''}
        </script>
        <script type="module" id="setup">
          window.addEventListener('message', async ({ data }) => {
            try {
              const { event, value } = data;

              if (event === 'DEVTOOLS') {
                if (value) eruda.show();
                else eruda.hide();
              } else if (event === 'THEME') {
                eruda._devTools.config.set('theme', value ? 'Dark' : 'Light');
                eruda._$el[0].style.colorScheme = value ? 'dark' : 'light';
              } else if (event === 'CODE_UPDATE') {
                window?.dispose?.();
                window.dispose = undefined;

                let app = document.getElementById('app');
                if (app) app.remove();
                app = document.createElement('div');
                app.id = 'app';
                document.body.prepend(app);

                console.clear();

                await import(value);
    
                const load = document.getElementById('load');
                if (load) load.remove();
              }
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
  const blob = new Blob([html], {
    type: 'text/html',
  });
  const src = URL.createObjectURL(blob);
  onCleanup(() => URL.revokeObjectURL(src));

  createEffect(() => {
    // Bail early on first mount or we are already reloading
    if (!props.reloadSignal) return;

    // Otherwise, reload everytime we clicked the reload button
    setIframeReady(false);
    iframe.src = src;
  });

  const styleScale = () => {
    if (zoomState.scale === 100 || !zoomState.scaleIframe) return '';

    return `width: ${zoomState.scale}%; height: ${zoomState.scale}%; transform: scale(${
      zoomState.zoom / 100
    }); transform-origin: 0 0;`;
  };

  onMount(() => {
    iframe.addEventListener('load', () => setIframeReady(true));
  });

  return (
    <div class="h-full w-full relative">
      <iframe
        title="Solid REPL"
        class="overflow-auto p-0 dark:bg-other block h-full w-full bg-white row-start-5"
        classList={props.classList}
        style={styleScale()}
        ref={iframe}
        src={src}
        // @ts-ignore
        sandbox="allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals allow-same-origin"
      ></iframe>
    </div>
  );
};

type Props = {
  classList?: {
    [k: string]: boolean | undefined;
  };
  code: string;
  reloadSignal: boolean;
  devtools: boolean;
  isDark: boolean;
};
