import { Component, createMemo, splitProps } from "solid-js";

export const Preview: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ["code"]);

  const iframeCode = createMemo(() => {
    const html = btoa(
      `
        <body>
          <p id="loader">Loading...</p>
          <div id="app"></div>
          <script type="module" id="script">
            ${internal.code.replace(
              /(import(?:.)*from\s*(?:'|"))(.*)((?:'|"))/gim,
              "$1https://cdn.skypack.dev/$2$3"
            )}
          </script>

          <script>
            window.addEventListener('load', () => {
              document.getElementById('loader').remove()
            })
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
