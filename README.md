# Solid Template Explorer

This is the source code of the [solid-template-explorer](https://solid-template-explorer.netlify.app) website.
Through it you can quicklky discover what the solid compiler will generate from your JSX templates.

There are 3 modes available:

- DOM: The classic SPA generation mechanism
- SSR: The server side generation mechanism
- HYDRATATION: The client side generation for hydratation

## Getting up and running

This project is built using the [pnpm](https://pnpm.js.org/) package manager.
You should therefore [install it](https://pnpm.js.org/en/installation) before anything else.

Once you got it up and running you can follow these steps the have a fully working environement:

```bash
# Clone the project
$ git clone git@github.com:amoutonbrady/solid-repl-poc.git

# cd into the project and install the dependencies
$ cd solid-repl-poc && pnpm install

# Start the dev server, the address is available at http://localhost:1234
$ pnpm dev

# Build the project
$ pnpm build
```

## Credits / Technologies used

- [solid-js](https://github.com/ryansolid/solid/): The view library
- [@babel/standalone](https://babeljs.io/docs/en/babel-standalone): The in-browser compiler. Solid compiler relies on babel
- [codemirror 6](https://codemirror.net/6/): The in-browser code editor. This is the next version of codemirror rewritten in TS
- [tailwindcss](https://tailwindcss.com/): The CSS framework
- [parcel 2](https://v2.parceljs.org/): The module bundler
- [workbox](https://developers.google.com/web/tools/workbox): The service worker generator
- [pnpm](https://pnpm.js.org/): The package manager
- [lz-string](https://github.com/pieroxy/lz-string): The string compression algorith used to share REPL
