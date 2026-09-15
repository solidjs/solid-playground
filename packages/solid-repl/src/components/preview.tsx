import { Component, createEffect, JSX, on, onCleanup, onMount } from 'solid-js';
import { useZoom } from '../hooks/useZoom';
import { Orientation, SplitviewComponent } from 'dockview';
import { SolidSplitviewPanel } from '../kernel/mountSolid';
import { css } from 'styled-system/css';

const iframeStyles = css({
  display: 'block',
  h: 'full',
  minH: 0,
  w: 'full',
  minW: 0,
  p: 0,
  overflow: 'scroll',
  bg: 'white',
  _dark: { bg: 'neutral.900' },
});

const devtoolsIframeStyles = css({
  h: 'full',
  minH: 0,
  w: 'full',
  minW: 0,
});

const previewContainer = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minH: 0,
});

const dispatchZoomKeyToParent = `
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (!['=', '-'].includes(e.key)) return;
    window.parent.postMessage({ event: 'ZOOM_KEY', value: { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey } }, '*');
    e.preventDefault();
  }, true);
`;

// Opaque-origin iframe: storage access throws, and chobitsu's getUrl() falls back to a
// cross-origin parent.location read that blanks chii's Sources panel.
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
    let loading = false;
    let queued = undefined;
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

    const runCode = (sources) => {
      window.dispose?.();
      window.dispose = undefined;

      const app = document.getElementById('app');
      if (app) app.innerHTML = '';

      console.clear();

      document.getElementById('appsrc')?.remove();
      document.getElementById('load')?.remove();

      for (const url of Object.values(cache)) {
        if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
      cache = {};

      loading = true;
      const settle = () => {
        loading = false;
        const next = queued;
        queued = undefined;
        if (next) runCode(next);
      };
      const script = document.createElement('script');
      script.id = 'appsrc';
      script.type = 'module';
      script.onload = settle;
      script.onerror = settle;
      script.src = buildModule('./main', sources['./main'], sources);
      document.body.appendChild(script);
    };

    chobitsu.setOnMessage((message) => window.parent.postMessage(message, '*'));

    let pageSource = '';
    const pageDomain = chobitsu.domain('Page');
    if (pageDomain) {
      pageDomain.getResourceContent = (params) =>
        Promise.resolve({ base64Encoded: false, content: params.frameId === '1' ? pageSource : '' });
    }

    const handlers = {
      CODE_UPDATE: (sources) => {
        if (!sources || typeof sources['./main'] !== 'string') return;
        if (loading) queued = sources;
        else runCode(sources);
      },
      IMPORT_MAP: (imports) => {
        document.getElementById('importmap')?.remove();
        const importMap = document.createElement('script');
        importMap.id = 'importmap';
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify({ imports });
        document.head.appendChild(importMap);
      },
      DARK: (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
      },
      PAGE_SOURCE: (source) => {
        pageSource = source;
      },
      DEV: (message) => {
        chobitsu.sendRawMessage(message);
      },
    };

    window.addEventListener('message', (e) => {
      try {
        handlers[e.data?.event]?.(e.data.value);
      } catch (err) {
        console.error(err);
      }
    });

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

const devtoolsHtml = `
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

type PreviewMessage =
  | { event: 'PAGE_SOURCE'; value: string }
  | { event: 'IMPORT_MAP'; value: Record<string, string> }
  | { event: 'CODE_UPDATE'; value: Record<string, string> }
  | { event: 'DARK'; value: boolean }
  | { event: 'DEV'; value: string };

interface PreviewProps {
  importMap: Record<string, string>;
  code: Record<string, string>;
  devtools: boolean;
  isDark: boolean;
  pointerEvents: boolean;
}

export const Preview: Component<PreviewProps> = (props) => {
  const { zoomState } = useZoom();

  let iframe!: HTMLIFrameElement;
  let devtoolsIframe: HTMLIFrameElement | undefined;
  let outerContainer!: HTMLDivElement;

  let iframeReady = false;
  // DevTools boots before the preview document exists; its startup requests (Page.getResourceTree
  // among them, which gates its console) must reach chobitsu once the document is there.
  const pendingDevtools: string[] = [];

  const sendToIframe = (msg: PreviewMessage) => {
    if (!iframeReady) return;
    iframe.contentWindow?.postMessage(msg, '*');
  };

  // A DevTools session is tied to one preview document: reload it whenever the document is replaced.
  const reloadDevtools = () => {
    pendingDevtools.length = 0;
    devtoolsIframe?.contentWindow?.location.reload();
  };

  const uiTheme = () => (props.isDark ? '"dark"' : '"default"');
  localStorage.setItem('uiTheme', uiTheme());

  const devtoolsUrl = URL.createObjectURL(new Blob([devtoolsHtml], { type: 'text/html' }));
  onCleanup(() => URL.revokeObjectURL(devtoolsUrl));
  const devtoolsSrc = `${devtoolsUrl}#?embedded=${encodeURIComponent(location.origin)}`;

  const pointerEvents = () => (props.pointerEvents ? 'inherit' : 'none');

  const iframeStyle = () => {
    if (zoomState.scale === 100 || !zoomState.scaleIframe) return `pointer-events: ${pointerEvents()};`;
    return `pointer-events: ${pointerEvents()}; width: ${zoomState.scale}%; height: ${zoomState.scale}%; transform: scale(${
      zoomState.zoom / 100
    }); transform-origin: 0 0;`;
  };

  const onIframeLoad = () => {
    iframeReady = true;
    sendToIframe({ event: 'PAGE_SOURCE', value: iframeHtml });
    sendToIframe({ event: 'IMPORT_MAP', value: props.importMap });
    sendToIframe({ event: 'DARK', value: props.isDark });
    for (const message of pendingDevtools.splice(0)) sendToIframe({ event: 'DEV', value: message });
    if (props.code['./main']) sendToIframe({ event: 'CODE_UPDATE', value: props.code });
  };

  const views: Record<string, () => JSX.Element> = {
    preview: () => (
      <iframe
        title="Solid REPL"
        class={iframeStyles}
        style={iframeStyle()}
        ref={iframe}
        srcdoc={iframeHtml}
        onload={onIframeLoad}
        // @ts-ignore
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-pointer-lock"
      />
    ),
    devtools: () => (
      <iframe
        title="Devtools"
        class={devtoolsIframeStyles}
        style={`pointer-events: ${pointerEvents()}`}
        ref={devtoolsIframe}
        src={devtoolsSrc}
      />
    ),
  };

  const onMessage = (event: MessageEvent) => {
    if (event.data?.event === 'ZOOM_KEY') {
      document.dispatchEvent(new KeyboardEvent('keydown', event.data.value));
    } else if (!devtoolsIframe) {
      return;
    } else if (event.source === iframe.contentWindow) {
      devtoolsIframe.contentWindow!.postMessage(event.data, '*');
    } else if (event.source === devtoolsIframe.contentWindow) {
      if (iframeReady) sendToIframe({ event: 'DEV', value: event.data });
      else pendingDevtools.push(event.data);
    }
  };

  onMount(() => {
    const splitview = new SplitviewComponent(outerContainer, {
      orientation: Orientation.VERTICAL,
      createComponent: ({ id, name }) => new SolidSplitviewPanel(id, name, views[name]),
    });
    splitview.addPanel({ id: 'preview', component: 'preview', minimumSize: 100 });
    if (props.devtools) splitview.addPanel({ id: 'devtools', component: 'devtools', minimumSize: 100, snap: true });

    window.addEventListener('message', onMessage);
    onCleanup(() => window.removeEventListener('message', onMessage));

    createEffect(
      on(
        () => props.importMap,
        () => {
          if (!iframeReady) return;
          // A changed import map only takes effect in a fresh document.
          iframeReady = false;
          iframe.srcdoc = iframeHtml;
          reloadDevtools();
        },
        { defer: true },
      ),
    );

    createEffect(() => {
      if (props.code['./main']) sendToIframe({ event: 'CODE_UPDATE', value: props.code });
    });

    createEffect(
      on(
        () => props.isDark,
        (isDark) => {
          sendToIframe({ event: 'DARK', value: isDark });
          localStorage.setItem('uiTheme', uiTheme());
          reloadDevtools();
        },
        { defer: true },
      ),
    );
  });

  return <div class={previewContainer} ref={outerContainer} />;
};
