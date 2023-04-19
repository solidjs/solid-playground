import { Component, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js';
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
      <script type="importmap">${importMap}</script>
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
            } else if (event === 'LOADED') {
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
            }
          } catch (e) {
            console.error(e);
          }
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

  let devtoolsLoaded = false;

  // This is the createWriteable paradigm in action
  // We have that the iframe src is entangled with its loading state
  const iframeLoader = createMemo(() => {
    const html = generateHTML(props.isDark, JSON.stringify({ imports: props.importMap }));
    const loaded = createSignal(false);
    return [html, loaded] as const;
  });
  const iframeSrcUrl = createMemo(() => {
    const [html] = iframeLoader();
    const url = URL.createObjectURL(
      new Blob([html], {
        type: 'text/html',
      }),
    );
    onCleanup(() => URL.revokeObjectURL(url));
    return url;
  });
  const isIframeReady = () => {
    const [, [loaded]] = iframeLoader();
    return loaded();
  };
  const setIframeReady = (value: boolean) => {
    const [, [, setLoaded]] = iframeLoader();
    setLoaded(value);
  };

  createEffect(() => {
    if (!isIframeReady()) return;

    iframe.contentDocument!.documentElement.classList.toggle('dark', props.isDark);
  });

  createEffect(() => {
    if (!props.reloadSignal) return;

    setIframeReady(false);
    iframe.src = untrack(iframeSrcUrl);
  });

  createEffect(() => {
    if (!isIframeReady()) return;

    iframe.contentWindow!.postMessage({ event: 'CODE_UPDATE', value: props.code }, untrack(iframeSrcUrl));
  });

  const devtoolsSrc = useDevtoolsSrc();

  const messageListener = (event: MessageEvent) => {
    if (event.source === iframe.contentWindow) {
      devtoolsIframe.contentWindow!.postMessage(event.data, devtoolsSrc);
    }
    if (event.source === devtoolsIframe.contentWindow) {
      iframe.contentWindow!.postMessage({ event: 'DEV', data: event.data }, untrack(iframeSrcUrl));
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

  const saveHeight = throttle((height: number) => {
    localStorage.setItem('iframe_height', height.toString());
  });

  function loadHeight() {
    const loaded = localStorage.getItem('iframe_height');
    return parseFloat(loaded || '1.25');
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
    saveHeight(percentage * 2);
  };

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
        onload={() => {
          setIframeReady(true);
          if (devtoolsLoaded) iframe.contentWindow!.postMessage({ event: 'LOADED' }, untrack(iframeSrcUrl));
        }}
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
        onload={() => (devtoolsLoaded = true)}
        classList={{ block: props.devtools, hidden: !props.devtools }}
      />
    </div>
  );
};

type Props = {
  importMap: Record<string, string>;
  classList?: {
    [k: string]: boolean | undefined;
  };
  code: string;
  reloadSignal: boolean;
  devtools: boolean;
  isDark: boolean;
};
