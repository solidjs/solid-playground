import { Component, createSignal } from 'solid-js';

import pkg from '../../package.json';
import logo from 'url:../assets/images/logo.svg';

export const Header: Component = () => {
  const [copy, setCopy] = createSignal(false);

  function share() {
    const url = location.href;

    fetch('/', { method: 'PUT', body: `{"url":"${url}"}` })
      .then((r) => r.text())
      .then((hash) => {
        const tinyUrl = new URL(location.origin);
        tinyUrl.searchParams.set('hash', hash);

        navigator.clipboard.writeText(tinyUrl.toString()).then(() => {
          setCopy(true);
          setTimeout(setCopy, 750, false);
        });
      })
      .catch(console.error);
  }

  return (
    <header class="md:col-span-3 p-2 flex text-sm justify-between items-center bg-brand-default text-white">
      <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest">
        <a href="https://github.com/ryansolid/solid">
          <img src={logo} alt="solid-js logo" class="w-8" />
        </a>
        <span class="inline-block -mb-1">Solid Playground</span>
      </h1>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          onClick={share}
          class="-mb-1 leading-none px-3 py-2 focus:outline-none focus:ring-1 rounded"
          classList={{
            'text-white': !copy(),
            'text-green-100': copy(),
          }}
        >
          {copy() ? 'Copied to clipboard' : 'Share'}
        </button>
        <span class="-mb-1 leading-none text-white">v{pkg.dependencies['solid-js'].slice(1)}</span>
      </div>
    </header>
  );
};
