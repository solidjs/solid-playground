import { Accessor, Component, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js';
import { isServer } from 'solid-js/web';
import { useZoom } from '../hooks/useZoom';
import { GridResizer } from './gridResizer';
import { isWebKit } from '@solid-primitives/platform';
import { clampPercentage } from '../helpers/clampPercentage';
const generateHTML = (isDark: boolean, importMap: string, devtoolsCode: string) => `
  <!doctype html>
  <html${isDark ? ' class="dark"' : ''}>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <link href="https://unpkg.com/modern-normalize@1.1.0/modern-normalize.css" rel="stylesheet">
      <script async src="https://ga.jspm.io/npm:es-module-shims@1.7.0/dist/es-module-shims.js"></script>
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

        .dark body {
          color: #e5e7eb;
        }

        .dark {
          color-scheme: dark;
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
      ${importMap}
      <script type="module">
        window.addEventListener('message', async ({ data }) => {
          const { event, value } = data;

          if (event !== 'CODE_UPDATE') return;

          window.dispose?.();
          window.dispose = undefined;

          document.getElementById('app').innerHTML = "";

          console.clear();

          document.getElementById('appsrc')?.remove();
          const script = document.createElement('script');
          script.src = value;
          script.id = 'appsrc';
          script.type = 'module';
          document.body.appendChild(script);

          const load = document.getElementById('load');
          if (load) load.remove();
        })
        ${devtoolsCode}
      </script>
    </head>
    
    <body>
      <div id="load" style="display: flex; height: 80vh; align-items: center; justify-content: center;">
        <p style="font-size: 1.5rem">Loading the playground...</p>
      </div>
      <div id="app"></div>
      <script id="appsrc" type="module"></script>
    </body>
  </html>`;
const generateDevtoolsCode = () => {
  if (isWebKit) return '';

  return `
    window.injectTarget = () => {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chii@1.9.0/public/target.js';
    script.setAttribute('embedded', 'true');
    script.setAttribute('cdn', 'https://cdn.jsdelivr.net/npm/chii@1.9.0/public');
    document.head.appendChild(script);
  }`;
};
export const Preview: Component<Props> = (props) => {
  const { zoomState } = useZoom();

  let iframe!: HTMLIFrameElement;
  let devtoolsIframe!: HTMLIFrameElement;
  let resizer!: HTMLDivElement;
  let outerContainer!: HTMLDivElement;

  const [isIframeReady, setIframeReady] = createSignal(false);

  if (!isServer) {
    try {
      const selectedPanel = localStorage.getItem('panel-selectedTab');
      if (!selectedPanel) {
        localStorage.setItem('panel-selectedTab', '"console"');
      }
    } catch (err) {}
  }

  createEffect(() => {
    if (!props.code) return;
    if (!isIframeReady()) return;

    const blob = new Blob([props.code], {
      type: 'text/javascript',
    });
    const src = URL.createObjectURL(blob);
    onCleanup(() => URL.revokeObjectURL(src));

    iframe.contentWindow!.postMessage({ event: 'CODE_UPDATE', value: src }, '*');
  });

  createEffect(() => {
    if (!isIframeReady()) return;

    iframe.contentWindow!.postMessage({ event: 'DEVTOOLS', value: props.devtools }, '*');
  });

  createEffect(() => {
    if (!isIframeReady()) return;

    iframe.contentDocument!.documentElement.classList.toggle('dark', props.isDark);
    iframe.contentWindow!.postMessage({ event: 'THEME', value: props.isDark }, '*');
  });

  let srcUrl = createMemo(() => {
    const importMapStr = `<script type="importmap">${JSON.stringify({
      imports: props.importMap(),
    })}</script>`;
    const html = generateHTML(
      untrack(() => props.isDark),
      importMapStr,
      generateDevtoolsCode(),
    );
    const blob = new Blob([html], {
      type: 'text/html',
    });
    const url = URL.createObjectURL(blob);
    onCleanup(() => URL.revokeObjectURL(url));
    return url;
  });
  createEffect(() => {
    // Bail early on first mount or we are already reloading
    if (!props.reloadSignal) return;

    // Otherwise, reload everytime we clicked the reload button
    setIframeReady(false);
    iframe.src = srcUrl()!;
  });

  window.addEventListener('message', (event) => {
    iframe.contentWindow?.postMessage(event.data, event.origin);
  });

  createEffect(() => {
    if (isWebKit) return;
    if (!isIframeReady()) return;
    (iframe.contentWindow! as any).ChiiDevtoolsIframe = devtoolsIframe;
    (iframe.contentWindow! as any).injectTarget();
  });

  const styleScale = () => {
    if (zoomState.scale === 100 || !zoomState.scaleIframe) return '';

    return `width: ${zoomState.scale}%; height: ${zoomState.scale}%; transform: scale(${
      zoomState.zoom / 100
    }); transform-origin: 0 0;`;
  };
  const [iframeHeight, setIframeHeight] = createSignal<string>('1fr');
  const changeIframeHeight = (clientY: number) => {
    let position: number;
    let size: number;

    const rect = outerContainer.getBoundingClientRect();

    position = clientY - rect.top - resizer.offsetHeight / 2;
    size = outerContainer.offsetHeight - resizer.offsetHeight;
    const percentage = (position / size) * 100;
    setIframeHeight(clampPercentage(percentage, 5, 95) + '%');
  };
  const devtoolsHeight = () => {
    if (iframeHeight() == '1fr') {
      return '1fr';
    }
    return 100 - parseInt(iframeHeight().replace('%', '')) + '%';
  };
  createEffect(() => {});
  return (
    <div
      class="grid h-full w-full overflow-clip"
      ref={outerContainer}
      style={{
        'grid-template-rows': props.devtools && !isWebKit ? `${iframeHeight()} auto ${devtoolsHeight()}` : '100% 0%',
      }}
    >
      <div>
        <iframe
          title="Solid REPL"
          class="dark:bg-other row-start-5 block h-full w-full overflow-auto bg-white p-0"
          classList={props.classList}
          style={styleScale()}
          ref={iframe}
          src={srcUrl()}
          onload={[setIframeReady, true]}
          // @ts-ignore
          sandbox="allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals allow-same-origin"
        />
      </div>
      <Show when={!isWebKit}>
        <div>
          <GridResizer
            ref={resizer}
            isHorizontal={true}
            onResize={(_, y) => {
              changeIframeHeight(y);
            }}
          />
        </div>
        <div>
          <iframe
            class="h-full w-full"
            ref={devtoolsIframe}
            style={{ display: props.devtools ? 'block' : 'none' }}
          ></iframe>
        </div>
      </Show>
    </div>
  );
};

type Props = {
  importMap: Accessor<any>;
  classList?: {
    [k: string]: boolean | undefined;
  };
  code: string;
  reloadSignal: boolean;
  devtools: boolean;
  isDark: boolean;
};
