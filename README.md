<p>
  <img width="100%" src="https://assets.solidjs.com/banner?project=Playground&type=core" alt="Solid Playground">
</p>

# Solid Template Explorer

This is the source code of the [solid playground](https://playground.solidjs.com) website.
Through it you can quickly discover what the solid compiler will generate from your JSX templates.

There are 4 compile modes available:

- DOM: The classic SPA generation mechanism
- SSR: The server side generation mechanism
- HYDRATION: The client side generation for hydration
- UNIVERSAL: The client side generation for universal (custom renderer)

## Getting up and running

This project is built using the [pnpm](https://pnpm.io/) package manager.

Once you have it installed, follow these steps to get a fully working environment:

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

## Credits / Technologies used

- [solid-js](https://github.com/solidjs/solid/): The view library
- [@babel/standalone](https://babeljs.io/docs/en/babel-standalone): The in-browser compiler. Solid compiler relies on babel
- [CodeMirror](https://codemirror.net/): The in-browser code editor, backed by the TypeScript language service and ESLint in a web worker
- [dockview](https://dockview.dev/): The panel layout
- [Panda CSS](https://panda-css.com/): The CSS framework
- [Zag](https://zagjs.com/): The UI state machines
- [vite](https://vitejs.dev/): The module bundler
- [pnpm](https://pnpm.io/): The package manager
- [lz-string](https://github.com/pieroxy/lz-string): The string compression algorithm used by legacy share links
