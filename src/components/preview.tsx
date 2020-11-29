import { Component, createEffect, createMemo, splitProps } from "solid-js";

export const Preview: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ["code"]);

  let iframe!: HTMLIFrameElement;

  createEffect(() => {
    iframe.contentWindow!.postMessage(
      internal.code.replace("render(", "window.dispose = render("),
      "*"
    );
  });

  const html = btoa(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://unpkg.com/tailwindcss@2.0.1/dist/base.min.css" rel="stylesheet">
        <link href="https://unpkg.com/@tailwindcss/typography@0.3.1/dist/typography.min.css" rel="stylesheet">

        <script>
          window.addEventListener('message', ({ data }) => {
            const oldScript = document.getElementById('script');
            if (oldScript) oldScript.remove();
            window.dispose && typeof window.dispose === 'function' && window.dispose()

            const script = document.createElement('script');
            script.innerHTML = data;
            script.type = 'module';
            script.id = 'script';
            document.body.appendChild(script);
          })
        </script>
      </head>
      <body class="prose">
        <div id="app"></div>
      </body>
    </html>
  `);

  const srcDoc = `data:text/html;base64,${html}`;

  return <iframe ref={iframe} {...external} src={srcDoc}></iframe>;
};

interface Props extends JSX.HTMLAttributes<HTMLIFrameElement> {
  code: string;
}
