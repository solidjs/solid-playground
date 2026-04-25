import { Component, createEffect, JSX, onCleanup, onMount } from 'solid-js';
import { useZoom } from '../hooks/useZoom';
import { Orientation, SplitviewComponent } from 'dockview-core';
import { SolidPanelView } from '../dockview/solid';

const dispatchZoomKeyToParent = `
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (!['=', '-'].includes(e.key)) return;
    window.parent.postMessage({ event: 'ZOOM_KEY', value: { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey } }, '*');
    e.preventDefault();
  }, true);
`;

// Sandboxed iframes get a unique opaque origin, which causes two problems for chobitsu:
//   1. localStorage / sessionStorage throw on access (opaque origins have no storage).
//   2. chobitsu's getUrl()/getOrigin() fall back to parent.location.{href,origin} for
//      "about:" / "null"-origin pages, and that read is cross-origin and throws — which
//      blanks out Page.getResourceTree, so chii's Sources panel stays empty.
// We install in-memory storage shims and replace `parent` with a thin object that returns
// the iframe's own location while forwarding postMessage to the real parent (so we can
// still talk to the playground).
const sandboxShim = `
  (() => {
    const make = () => {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
        clear: () => { m.clear(); },
        key: (i) => Array.from(m.keys())[i] ?? null,
        get length() { return m.size; },
      };
    };
    Object.defineProperty(window, 'localStorage', { value: make(), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: make(), configurable: true });
    const realParent = window.parent;
    window.parent = {
      location: { href: location.href, origin: location.origin || 'about:srcdoc' },
      postMessage: (msg, target, transfer) => realParent.postMessage(msg, target, transfer),
    };
  })();
`;

const mainIframeScript = `
  (() => {
    let finisher = undefined;
    let cache = {};

    const buildModule = (name, source, sources) => {
      if (cache[name]) return cache[name];
      cache[name] = 'error:cyclic import';
      const out = source.replace(/(['"])solidrepl:([^'"]+)\\1/g, (_, q, rel) => {
        if (sources[rel] == null) return q + rel + q;
        return q + buildModule(rel, sources[rel], sources) + q;
      });
      const blob = new Blob([out], { type: 'text/javascript' });
      cache[name] = URL.createObjectURL(blob);
      return cache[name];
    };

    const handleCodeUpdate = (sources) => {
      if (!sources || typeof sources['./main'] !== 'string') return;

      window.dispose?.();
      window.dispose = undefined;

      if (document.getElementById('app')) document.getElementById('app').innerHTML = '';

      console.clear();

      document.getElementById('appsrc')?.remove();

      for (const url of Object.values(cache)) {
        if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
      cache = {};

      const script = document.createElement('script');
      script.id = 'appsrc';
      script.type = 'module';
      finisher = () => {};
      script.onload = () => {
        if (finisher) finisher();
        finisher = undefined;
      };
      script.src = buildModule('./main', sources['./main'], sources);
      document.body.appendChild(script);

      const load = document.getElementById('load');
      if (load) load.remove();
    };

    const sendToDevtools = (message) => {
      window.parent.postMessage(JSON.stringify(message), '*');
    };
    let id = 0;
    const sendToChobitsu = (message) => {
      message.id = 'tmp' + ++id;
      chobitsu.sendRawMessage(JSON.stringify(message));
    };
    chobitsu.setOnMessage((message) => {
      if (message.includes('"id":"tmp')) return;
      window.parent.postMessage(message, '*');
    });

    let pageSource = '';
    const pageDomain = chobitsu.domain('Page');
    if (pageDomain) {
      pageDomain.getResourceContent = (params) => {
        if (params.frameId === '1') {
          return Promise.resolve({ base64Encoded: false, content: pageSource });
        }
        return Promise.resolve({ base64Encoded: false, content: '' });
      };
    }

    const handle = (data) => {
      try {
        const { event, value } = data;
        if (event === 'CODE_UPDATE') {
          const next = () => handleCodeUpdate(value);
          if (finisher !== undefined) finisher = next;
          else next();
        } else if (event === 'IMPORT_MAP') {
          document.getElementById('importmap')?.remove();
          const importMap = document.createElement('script');
          importMap.id = 'importmap';
          importMap.type = 'importmap';
          importMap.textContent = JSON.stringify({ imports: value });
          document.head.appendChild(importMap);
        } else if (event === 'DARK') {
          document.documentElement.classList.toggle('dark', value);
        } else if (event === 'PAGE_SOURCE') {
          pageSource = value;
        } else if (event === 'DEV') {
          chobitsu.sendRawMessage(data.data);
        } else if (event === 'LOADED') {
          sendToDevtools({
            method: 'Page.frameNavigated',
            params: {
              frame: { id: '1', mimeType: 'text/html', securityOrigin: parent.location.origin, url: parent.location.href },
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
    };

    window.addEventListener('message', (e) => handle(e.data));

    ${dispatchZoomKeyToParent}
  })();
`;

const iframeHtml = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://ga.jspm.io/npm:modern-normalize@3.0.1/modern-normalize.css" rel="stylesheet" />
    <style>
      html, body { position: relative; width: 100%; height: 100%; }
      body {
        color: #333; margin: 0; padding: 8px; box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        max-width: 100%;
      }
      .dark body { color: #e5e7eb; }
      .dark { color-scheme: dark; }
      input, button, select, textarea {
        padding: 0.4em; margin: 0 0 0.5em 0; box-sizing: border-box;
        border: 1px solid #ccc; border-radius: 2px;
      }
      button { color: #333; background-color: #f4f4f4; outline: none; }
      button:disabled { color: #999; }
      button:not(:disabled):active { background-color: #ddd; }
      button:focus { border-color: #666; }
    </style>
    <script>${sandboxShim}</script>
    <script src="https://cdn.jsdelivr.net/npm/chobitsu@1.8.6/dist/chobitsu.min.js"></script>
    <script>${mainIframeScript}</script>
  </head>
  <body>
    <div id="load" style="display: flex; height: 80vh; align-items: center; justify-content: center">
      <p style="font-size: 1.5rem">Loading the playground...</p>
    </div>
    <div id="app"></div>
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
  <script>${dispatchZoomKeyToParent}</script>
  <meta name="referrer" content="no-referrer">
  <script src="https://unpkg.com/@ungap/custom-elements/es.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.15.5/public/front_end/entrypoints/chii_app/chii_app.js"></script>
  <body class="undocked" id="-blink-dev-tools">`;
  const devtoolsRawUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  onCleanup(() => URL.revokeObjectURL(devtoolsRawUrl));
  return `${devtoolsRawUrl}#?embedded=${encodeURIComponent(location.origin)}`;
};

export const Preview: Component<Props> = (props) => {
  const { zoomState } = useZoom();

  let iframe!: HTMLIFrameElement;
  let devtoolsIframe!: HTMLIFrameElement;
  let outerContainer!: HTMLDivElement;

  let devtoolsLoaded = false;
  let isIframeReady = false;

  const sendToIframe = (msg: any) => {
    if (!isIframeReady) return;
    iframe.contentWindow!.postMessage(msg, '*');
  };

  createEffect(() => {
    if (!props.reloadSignal) return;

    isIframeReady = false;
    iframe.srcdoc = iframeHtml;
  });

  const devtoolsSrc = useDevtoolsSrc();

  const styleScale = () => {
    const pointerEvents = props.pointerEvents ? 'inherit' : 'none';
    if (zoomState.scale === 100 || !zoomState.scaleIframe) return `pointer-events: ${pointerEvents};`;

    return `pointer-events: ${pointerEvents}; width: ${zoomState.scale}%; height: ${zoomState.scale}%; transform: scale(${
      zoomState.zoom / 100
    }); transform-origin: 0 0;`;
  };

  onMount(() => {
    const frameworkComponents: Record<string, () => JSX.Element> = {
      preview: () => (
        <iframe
          title="Solid REPL"
          class="h-full min-h-0 w-full min-w-0 bg-white p-0 block overflow-scroll dark:bg-darkbg"
          style={styleScale()}
          ref={iframe}
          srcdoc={iframeHtml}
          onload={() => {
            isIframeReady = true;

            if (devtoolsLoaded) sendToIframe({ event: 'LOADED' });
            sendToIframe({ event: 'PAGE_SOURCE', value: iframeHtml });
            sendToIframe({ event: 'IMPORT_MAP', value: props.importMap });
            if (props.code['./main']) sendToIframe({ event: 'CODE_UPDATE', value: props.code });
            sendToIframe({ event: 'DARK', value: props.isDark });
          }}
          // @ts-ignore
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-pointer-lock"
        />
      ),
      devtools: () => (
        <iframe
          title="Devtools"
          class="h-full min-h-0 w-full min-w-0"
          style={`pointer-events: ${props.pointerEvents ? 'inherit' : 'none'}`}
          ref={devtoolsIframe}
          src={devtoolsSrc}
          onload={() => (devtoolsLoaded = true)}
          classList={{ block: props.devtools, hidden: !props.devtools }}
        />
      ),
    };
    const splitview = new SplitviewComponent(outerContainer, {
      orientation: Orientation.VERTICAL,

      createComponent: ({ id, name }) => {
        return new SolidPanelView(id, name, frameworkComponents[name]);
      },
    });
    splitview.addPanel({
      id: 'preview',
      component: 'preview',
      minimumSize: 100,
    });
    splitview.addPanel({
      id: 'devtools',
      component: 'devtools',
      minimumSize: 100,
      snap: true,
    });

    createEffect(() => {
      sendToIframe({ event: 'DARK', value: props.isDark });
    });

    createEffect(() => {
      sendToIframe({ event: 'IMPORT_MAP', value: props.importMap });
    });

    createEffect(() => {
      if (!props.code['./main']) return;
      sendToIframe({ event: 'CODE_UPDATE', value: props.code });
    });

    const messageListener = (event: MessageEvent) => {
      if (event.data?.event === 'ZOOM_KEY') {
        document.dispatchEvent(new KeyboardEvent('keydown', event.data.value));
        return;
      }
      if (event.source === iframe.contentWindow) {
        devtoolsIframe.contentWindow!.postMessage(event.data, '*');
      }
      if (event.source === devtoolsIframe.contentWindow) {
        iframe.contentWindow!.postMessage({ event: 'DEV', data: event.data }, '*');
      }
    };
    window.addEventListener('message', messageListener);
    onCleanup(() => window.removeEventListener('message', messageListener));

    createEffect(() => {
      localStorage.setItem('uiTheme', props.isDark ? '"dark"' : '"default"');

      if (!devtoolsLoaded) return;

      devtoolsIframe.contentWindow!.location.reload();
    });
  });

  return <div class="min-h-0 flex flex-1 flex-col" ref={outerContainer} classList={props.classList}></div>;
};

type Props = {
  importMap: Record<string, string>;
  classList?: {
    [k: string]: boolean | undefined;
  };
  code: Record<string, string>;
  reloadSignal: boolean;
  devtools: boolean;
  isDark: boolean;
  pointerEvents: boolean;
};
