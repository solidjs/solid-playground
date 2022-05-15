import { Component, createEffect, createSignal, splitProps, JSX, onMount } from 'solid-js';
import useZoom from '../hooks/useZoom';

export const Preview: Component<Props> = (props) => {
  const { zoomState } = useZoom();
  const [internal, external] = splitProps(props, [
    'code',
    'isDark',
    'class',
    'reloadSignal',
    'devtools',
  ]);

  let iframe!: HTMLIFrameElement;

  const [isIframeReady, setIframeReady] = createSignal(false);

  let latestCode: string;
  const CODE_UPDATE = 'CODE_UPDATE';

  createEffect(() => {
    // HACK: This helps prevent unnecessary updates
    const isNotDom =
      internal.code.includes('getNextElement') || internal.code.includes('getHydrationKey');

    const isEmpty = !internal.code;

    if (isNotDom || isEmpty || !isIframeReady()) return;

    latestCode = internal.code.replace('render(', 'window.dispose = render(');
    iframe.contentWindow!.postMessage({ event: CODE_UPDATE, code: latestCode }, '*');
  });

  createEffect(() => {
    if (!iframe) return;
    iframe.contentWindow!.postMessage({ event: 'DEVTOOLS', open: internal.devtools }, '*');
  });

  const setDarkMode = () => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    doc?.body!.classList.toggle('dark', internal.isDark);
    iframe.contentWindow!.postMessage({ event: 'THEME', dark: internal.isDark }, '*');
  };

  createEffect(() => {
    if (iframe && isIframeReady()) {
      setDarkMode();
    }
  });

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

        <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
        <script src="https://cdn.jsdelivr.net/npm/eruda-dom"></script>
        <script type="module">
          eruda.init({
            tool: ["console", "elements", "network", "resources"],
            defaults: {
              displaySize: 40,
              theme: "${internal.isDark ? 'Dark' : 'Light'}"
            }
          });
          eruda.add(erudaDom);
          eruda.position({ x: window.innerWidth - 30, y: window.innerHeight - 30 });
          const style = Object.assign(document.createElement('link'), {
            rel: 'stylesheet',
            href: '/eruda.css'
          });
          eruda._shadowRoot.appendChild(style);
          if (${internal.devtools}) eruda.show();
        </script>
        <script type="module" id="setup">
          window.addEventListener('message', async ({ data }) => {
            try {
              const { event, code } = data;

              if (event === 'DEVTOOLS') {
                if (data.open) eruda.show();
                else eruda.hide();
              } else if (event === 'THEME') {
                eruda._devTools.config.set('theme', data.dark ? 'Dark' : 'Light');
                eruda._$el[0].style.colorScheme = data.dark ? 'dark' : 'light';
              }
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

              console.clear();

              const encodedCode = encodeURIComponent(code);
              const dataUri = 'data:text/javascript;charset=utf-8,' + encodedCode;
              await import(dataUri);
  
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
    iframe.addEventListener('load', () => {
      setIframeReady(true);

      setDarkMode();
    });
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
    </div>
  );
};

type Props = JSX.HTMLAttributes<HTMLDivElement> & {
  code: string;
  reloadSignal: boolean;
  devtools: boolean;
  isDark: boolean;
};
