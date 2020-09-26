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
                    '"https://cdn.jsdelivr.net/npm/solid-js@0.20.1/dist/index.js"'
                  )
                  .replace(
                    /(?:"|')solid-js\/dom(?:"|')/gm,
                    '"https://cdn.jsdelivr.net/npm/solid-js@0.20.1/dist/dom/index.js"'
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
