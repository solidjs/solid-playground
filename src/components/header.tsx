import { Component, createSignal } from 'solid-js';
import { Icon } from '@amoutonbrady/solid-heroicons';
import { share, link } from '@amoutonbrady/solid-heroicons/outline';

import pkg from '../../package.json';
import logo from 'url:../assets/images/logo.svg';
import { useStore } from '../store';
import { exportToCsb } from '../utils/exportToCsb';

export const Header: Component = () => {
  const [copy, setCopy] = createSignal(false);
  const [store] = useStore();

  function shareLink() {
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
          onClick={() => exportToCsb(store.tabs)}
          class="px-3 py-2 focus:outline-none focus:ring-1 rounded text-white opacity-80 hover:opacity-100"
          title="Export to CodeSandbox"
        >
          <span class="sr-only">Export to CodeSandbox</span>
          <svg class="fill-current h-6" preserveAspectRatio="xMidYMid" viewBox="0 0 256 296">
            <path d="M115 261V154l-91-52v61l42 24v46l49 28zm24 1l51-29v-47l42-25v-60l-93 54v107zm81-181l-49-28-43 24-43-24-49 28 92 53 92-53zM0 222V74L128 0l128 74v148l-128 74L0 222z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={shareLink}
          class="px-3 py-2 focus:outline-none focus:ring-1 rounded"
          classList={{
            'text-white opacity-80 hover:opacity-100': !copy(),
            'text-green-100': copy(),
          }}
          title="Share with a minified link"
        >
          <span class="sr-only">{copy() ? 'Copied to clipboard' : 'Share'}</span>
          <Icon class="h-6" path={copy() ? link : share} />
        </button>

        <span class="-mb-1 leading-none text-white">v{pkg.dependencies['solid-js'].slice(1)}</span>
      </div>
    </header>
  );
};
