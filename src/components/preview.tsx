import {
  Component,
  createEffect,
  createSignal,
  onMount,
  splitProps,
} from "solid-js";

export const Preview: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ["code"]);

  let iframe!: HTMLIFrameElement;
  const [isIframeReady, setIframeReady] = createSignal();

  createEffect(() => {
    isIframeReady();

    const code = internal.code.replace("render(", "window.dispose = render(");
    const event = "CODE_UPDATE";

    iframe.contentWindow!.postMessage({ event, code }, "*");
  });

  onMount(() => {
    iframe.contentWindow!.addEventListener("message", ({ data }) => {
      switch (data.event) {
        case "DOM_READY":
          return setIframeReady(undefined);
      }
    });
  });

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://unpkg.com/tailwindcss@2.0.1/dist/base.min.css" rel="stylesheet">
        <link href="https://unpkg.com/@tailwindcss/typography@0.3.1/dist/typography.min.css" rel="stylesheet">

        <script type="module">
          window.addEventListener('message', ({ data }) => {
            const { event, code } = data;
            if (event === 'DOM_READY') return;

            const oldScript = document.getElementById('script');
            if (oldScript) oldScript.remove();

            window.dispose && typeof window.dispose === 'function' && window.dispose()

            if (!document.getElementById('app')) {
              const app = document.createElement('app');
              app.id = 'app';
              document.body.appendChild(app);
            }

            const script = document.createElement('script');
            script.innerHTML = code;
            script.type = 'module';
            script.id = 'script';
            document.body.appendChild(script);
          })

          window.postMessage({ event: 'DOM_READY' }, '*');
        </script>
      </head>
      <body class="prose"></body>
    </html>
  `;

  return <iframe ref={iframe} {...external} srcdoc={html}></iframe>;
};

interface Props extends JSX.HTMLAttributes<HTMLIFrameElement> {
  code: string;
}
