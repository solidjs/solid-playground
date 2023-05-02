<p>
  <img width="100%" src="https://assets.solidjs.com/banner?project=Playground&type=core" alt="Solid Playground">
</p>

# Solid Template Explorer

This is the source code of the [solid playground](https://playground.solidjs.com) website.
Through it you can quickly discover what the solid compiler will generate from your JSX templates.

There are 3 modes available:

- DOM: The classic SPA generation mechanism
- SSR: The server side generation mechanism
- HYDRATION: The client side generation for hydration

## Getting up and running

This project is built using the [pnpm](https://pnpm.js.org/) package manager.

Once you got it up and running you can follow these steps the have a fully working environement:

```bash
# Clone the project
$ git clone https://github.com/solidjs/solid-playground

# cd into the project and install the dependencies
$ cd solid-playground && pnpm i

# Start the dev server, the address is available at http://localhost:5173
$ pnpm run dev

# Build the project
$ pnpm run build
```

:warning: Firefox doesn't work by default in development (`pnpm dev`) due to to [vite's limitation with web worker](https://vitejs.dev/guide/features.html#web-workers). However it still works after build (`pnpm build`)

To develop on Firefox, ensure that `dom.workers.modules.enabled` is enabled in `about:config`

## Credits / Technologies used

- [solid-js](https://github.com/solidjs/solid/): The view library
- [@babel/standalone](https://babeljs.io/docs/en/babel-standalone): The in-browser compiler. Solid compiler relies on babel
- [monaco](https://microsoft.github.io/monaco-editor/): The in-browser code editor. This is the code editor that powers VS Code
- [Windi CSS](https://windicss.org/): The CSS framework
- [vite](https://vitejs.dev/): The module bundler
- [workbox](https://developers.google.com/web/tools/workbox): The service worker generator
- [pnpm](https://pnpm.js.org/): The package manager
- [lz-string](https://github.com/pieroxy/lz-string): The string compression algorithm used to share REPL
