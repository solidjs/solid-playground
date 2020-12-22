import {
  Component,
  createEffect,
  createSignal,
  onMount,
  splitProps,
  JSX,
} from "solid-js";

export const Preview: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ["code"]);

  let iframe!: HTMLIFrameElement;
  const [isIframeReady, setIframeReady] = createSignal(false);

  createEffect(() => {
    // HACK: This helps prevent unnecessary updates
    const isNotDom =
      internal.code.includes("getNextElement") ||
      internal.code.includes("getHydrationKey");

    if (isNotDom || !isIframeReady()) return;

    const code = internal.code.replace("render(", "window.dispose = render(");
    const event = "CODE_UPDATE";

    iframe.contentWindow!.postMessage({ event, code }, "*");
  });

  onMount(() => {
    iframe.contentWindow!.addEventListener("message", ({ data }) => {
      switch (data.event) {
        case "DOM_READY":
          return setIframeReady(true);
      }
    });
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
        <link rel="preload" href="https://unpkg.com/tailwindcss@2.0.1/dist/base.min.css" as="style">
        <link rel="preload" href="https://unpkg.com/@tailwindcss/typography@0.3.1/dist/typography.min.css" as="style">

        <link href="https://unpkg.com/tailwindcss@2.0.1/dist/base.min.css" rel="stylesheet">
        <link href="https://unpkg.com/@tailwindcss/typography@0.3.1/dist/typography.min.css" rel="stylesheet">

        <script type="module">
          window.addEventListener('message', ({ data }) => {
            try {
              const { event, code } = data;
              if (event === 'DOM_READY' || !code) return;
  
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
            } catch {}
          })

          window.postMessage({ event: 'DOM_READY' }, '*');
        </script>

        <style>
          body {
            max-width: 100%;
          }
        </style>
      </head>
      <body class="prose">
        <div id="load" style="display: flex; height: 100vh; align-items: center; justify-content: center;">
          <p style="font-size: 1.5rem">Loading the playground...</p>
        </div>
      </body>
    </html>
  `;

  return <iframe ref={iframe} {...external} srcdoc={html}></iframe>;
};

interface Props extends JSX.HTMLAttributes<HTMLIFrameElement> {
  code: string;
}
