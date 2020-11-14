import { Component, createMemo, splitProps } from "solid-js";

export const Preview: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ["code"]);

  const iframeCode = createMemo(() => {
    const html = btoa(
      `
        <body>
            <div id="app"></div>
            <script type="module">
              ${internal.code
                .replace(
                  /(?:"|')solid-js(?:"|')/gm,
                  '"https://cdn.skypack.dev/pin/solid-js@v0.22.0-HXOUi1bsabcdTm7pdkd1/min/solid-js.js"'
                )
                .replace(
                  /(?:"|')solid-js\/(dom)|(web)(?:"|')/gm,
                  '"https://cdn.skypack.dev/pin/solid-js@v0.22.0-HXOUi1bsabcdTm7pdkd1/min/solid-js/web.js"'
                )}
            </script>
        </body>`
    );

    return `data:text/html;base64,${html}`;
  });

  return <iframe {...external} src={iframeCode()}></iframe>;
};

interface Props extends JSX.HTMLAttributes<HTMLIFrameElement> {
  code: string;
}
