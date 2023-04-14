import { Accessor, Component, Show, createEffect, createMemo, createSignal, on, onCleanup, untrack } from 'solid-js';
import { useZoom } from '../hooks/useZoom';
import { GridResizer } from './gridResizer';
import { throttle } from '@solid-primitives/scheduled';

const generateHTML = (isDark: boolean, importMap: string) => `
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
      <script src="https://cdn.jsdelivr.net/npm/chobitsu"></script>
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
        const sendToDevtools = (message) => {
          window.parent.postMessage(JSON.stringify(message), '${location.origin}');
        };
        let id = 0;
        const sendToChobitsu = (message) => {
          message.id = 'tmp' + ++id;
          chobitsu.sendRawMessage(JSON.stringify(message));
        };
        chobitsu.setOnMessage((message) => {
          if (message.includes('"id":"tmp')) return;
          window.parent.postMessage(message, '${location.origin}');
        });
        window.addEventListener('message', ({ data }) => {
          try {
            const { event, value } = data;
            if (event === 'DEV') {
              chobitsu.sendRawMessage(data.data);
            }
          } catch (e) {
            console.error(e);
          }
        });
        
        setTimeout(() => {
          sendToDevtools({
            method: 'Page.frameNavigated',
            params: {
              frame: {
                id: '1',
                mimeType: 'text/html',
                securityOrigin: location.origin,
                url: location.href,
              },
              type: 'Navigation',
            },
          });
          sendToChobitsu({ method: 'Network.enable' });
          sendToDevtools({ method: 'Runtime.executionContextsCleared' });
          sendToChobitsu({ method: 'Runtime.enable' });
          sendToChobitsu({ method: 'Debugger.enable' });
          sendToChobitsu({ method: 'DOMStorage.enable' });
          sendToChobitsu({ method: 'DOM.enable' });
          sendToChobitsu({ method: 'CSS.enable' });
          sendToChobitsu({ method: 'Overlay.enable' });
          sendToDevtools({ method: 'DOM.documentUpdated' });
        });
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

const useDevtoolsSrc = () => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <meta charset="utf-8">
  <title>DevTools</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body {
        background-color: rgb(41 42 45);
      }
    }
  </style>
  <meta name="referrer" content="no-referrer">
  <script src="https://unpkg.com/@ungap/custom-elements/es.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.8.0/public/front_end/entrypoints/chii_app/chii_app.js"></script>
  <body class="undocked" id="-blink-dev-tools">`;
  const devtoolsRawUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  onCleanup(() => URL.revokeObjectURL(devtoolsRawUrl));
  return `${devtoolsRawUrl}#?embedded=${encodeURIComponent(location.origin)}`;
};

export const Preview: Component<Props> = (props) => {
  const { zoomState } = useZoom();

  let iframe!: HTMLIFrameElement;
  let devtoolsIframe!: HTMLIFrameElement;
  let resizer!: HTMLDivElement;
  let outerContainer!: HTMLDivElement;

  const [isIframeReady, setIframeReady] = createSignal(false);
  const appSrcUrl = createMemo(() => {
    if (!props.code) return;
    const blob = new Blob([props.code], {
      type: 'text/javascript',
    });
    const src = URL.createObjectURL(blob);
    onCleanup(() => URL.revokeObjectURL(src));
    return src;
  });
  createEffect(() => {
    if (!props.code) return;
    if (!isIframeReady()) return;

    iframe.contentWindow!.postMessage({ event: 'CODE_UPDATE', value: appSrcUrl() }, '*');
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

  let iframeSrcUrl = createMemo(() => {
    const importMapStr = `<script type="importmap">${JSON.stringify({ imports: props.importMap() })}</script>`;
    const html = generateHTML(
      untrack(() => props.isDark),
      importMapStr,
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
    iframe.src = iframeSrcUrl()!;
  });

  const devtoolsSrc = useDevtoolsSrc();

  const messageListener = (event: MessageEvent) => {
    if (event.source === iframe.contentWindow) {
      if (event.data == 'READY') {
        (devtoolsIframe.contentWindow! as any).runtime.loadLegacyModule('core/sdk/sdk-legacy.js').then(() => {
          const SDK = (devtoolsIframe.contentWindow! as any).SDK;
          for (const resourceTreeModel of SDK.TargetManager.instance().models(SDK.ResourceTreeModel)) {
            resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage, resourceTreeModel);
          }
        });
      } else {
        devtoolsIframe.contentWindow!.postMessage(event.data, devtoolsSrc);
      }
    }
    if (event.source === devtoolsIframe.contentWindow) {
      iframe.contentWindow!.postMessage({ event: 'DEV', data: event.data }, iframeSrcUrl());
    }
  };
  window.addEventListener('message', messageListener);
  onCleanup(() => window.removeEventListener('message', messageListener));

  const styleScale = () => {
    if (zoomState.scale === 100 || !zoomState.scaleIframe) return '';

    return `width: ${zoomState.scale}%; height: ${zoomState.scale}%; transform: scale(${
      zoomState.zoom / 100
    }); transform-origin: 0 0;`;
  };
  function saveHeight(height: number) {
    localStorage.setItem('iframe_height', height.toString());
  }
  function loadHeight() {
    if (typeof window == undefined) return 1;
    const loaded = localStorage.getItem('iframe_height');
    if (loaded == null) {
      return 1;
    }
    return parseFloat(loaded);
  }
  const [iframeHeight, setIframeHeight] = createSignal<number>(loadHeight());
  const changeIframeHeight = (clientY: number) => {
    let position: number;
    let size: number;

    const rect = outerContainer.getBoundingClientRect();

    position = clientY - rect.top - resizer.offsetHeight / 2;
    size = outerContainer.offsetHeight - resizer.offsetHeight;
    const percentage = position / size;

    setIframeHeight(percentage * 2);
  };

  createEffect(
    on(
      iframeHeight,
      throttle(() => {
        saveHeight(iframeHeight());
      }, 50),
    ),
  );
  return (
    <div
      class="grid h-full w-full"
      ref={outerContainer}
      classList={props.classList}
      style={{
        'grid-template-rows': props.devtools
          ? `minmax(0, ${iframeHeight()}fr) 12px minmax(0,${2 - iframeHeight()}fr)`
          : 'minmax(0, 1fr)',
      }}
    >
      <iframe
        title="Solid REPL"
        class="dark:bg-other block h-full w-full overflow-scroll bg-white p-0"
        style={styleScale()}
        ref={iframe}
        src={iframeSrcUrl()}
        onload={[setIframeReady, true]}
        // @ts-ignore
        sandbox="allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals allow-same-origin"
      />
      <Show when={props.devtools}>
        <GridResizer
          ref={resizer}
          isHorizontal={true}
          onResize={(_, y) => {
            changeIframeHeight(y);
          }}
        />
      </Show>
      <iframe
        class="h-full w-full"
        ref={devtoolsIframe}
        src={devtoolsSrc}
        classList={{ block: props.devtools, hidden: !props.devtools }}
      />
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
