import { Component, onCleanup, createSignal, JSX, Show, createMemo, For } from 'solid-js';
import { Icon } from '@amoutonbrady/solid-heroicons';
import {
  share,
  link,
  upload,
  xCircle,
  menu,
  moon,
  sun,
} from '@amoutonbrady/solid-heroicons/outline';

import logo from '../assets/logo.svg?url';
import { processImport, Tab } from '../../src';
import { exportToCsb } from '../utils/exportToCsb';
import { exportToJSON } from '../utils/exportToJson';
import { ZoomDropdown } from './zoomDropdown';
import { dark, setDark } from '../store';

export const Header: Component<{
  isHorizontal: boolean;
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => void;
  setCurrent: (tabId: string) => void;
  version: string;
  onVersionChange: (version: string) => void;
}> = (props) => {
  const [copy, setCopy] = createSignal(false);
  const [showMenu, setShowMenu] = createSignal(false);

  window.addEventListener('resize', closeMobileMenu);
  onCleanup(() => {
    window.removeEventListener('resize', closeMobileMenu);
  });

  function closeMobileMenu(event: any) {
    setShowMenu(false);
  }

  function shareLink() {
    const url = location.href;

    fetch('/', { method: 'PUT', body: `{"url":"${url}"}` })
      .then((r) => r.text())
      .then((hash) => {
        const tinyUrl = new URL(location.origin);
        tinyUrl.searchParams.set('hash', hash);
        tinyUrl.searchParams.set('version', props.version);

        navigator.clipboard.writeText(tinyUrl.toString()).then(() => {
          setCopy(true);
          setTimeout(setCopy, 750, false);
        });
      })
      .catch(console.error);
  }

  const uploadFile: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const [file] = event.currentTarget.files!;

    const tabs = processImport(JSON.parse(await file.text()));
    props.setTabs(tabs);
    props.setCurrent('main.tsx');
  };

  const versions = createMemo(() => {
    const hardCoded = ['0.26.5', '1.0.0'];

    return hardCoded.includes(props.version) ? hardCoded : [props.version, ...hardCoded];
  });

  return (
    <header
      class="p-2 flex text-sm justify-between items-center bg-brand-default text-white z-20"
      classList={{ 'md:col-span-3': !props.isHorizontal }}
    >
      <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest">
        <a href="https://github.com/solidjs/solid">
          <img src={logo} alt="solid-js logo" class="w-8" />
        </a>
        <span class="inline-block -mb-1">Solid Playground</span>
      </h1>
      <div class="flex items-center space-x-2">
        <div
          classList={{ 'absolute top-[53px] right-[10px] w-[fit-content]': showMenu() }}
          class="z-10"
        >
          <div
            class="md:items-center md:space-x-2 md:flex md:flex-row text-black dark:text-white"
            classList={{
              'shadow-md flex flex-col justify-center bg-white dark:bg-gray-700': showMenu(),
              hidden: !showMenu(),
            }}
          >
            <button
              type="button"
              onClick={() => {
                const toggledValue = !dark();
                setDark(toggledValue);
                localStorage.setItem('dark', String(toggledValue));
              }}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Toggle dark mode"
            >
              <Show when={dark} fallback={<Icon path={moon} class="h-6" />}>
                <Icon path={sun} class="h-6" />
              </Show>
              <span class="text-xs md:sr-only">{dark() ? 'Light' : 'Dark'} mode</span>
            </button>

            <label
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100 cursor-pointer"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Import from JSON"
            >
              <input type="file" class="sr-only" onChange={uploadFile} accept=".json" />
              <Icon path={upload} class="h-6" style={{ margin: '0' }} />
              <span class="text-xs md:sr-only">Import from JSON</span>
            </label>

            <button
              type="button"
              onClick={() => exportToJSON(props.tabs)}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Export to JSON"
            >
              <svg class="fill-current h-6" viewBox="0 0 24 24">
                <path d="M12.043 23.968c.479-.004.953-.029 1.426-.094a11.805 11.805 0 003.146-.863 12.404 12.404 0 003.793-2.542 11.977 11.977 0 002.44-3.427 11.794 11.794 0 001.02-3.476c.149-1.16.135-2.346-.045-3.499a11.96 11.96 0 00-.793-2.788 11.197 11.197 0 00-.854-1.617c-1.168-1.837-2.861-3.314-4.81-4.3a12.835 12.835 0 00-2.172-.87h-.005c.119.063.24.132.345.201.12.074.239.146.351.225a8.93 8.93 0 011.559 1.33c1.063 1.145 1.797 2.548 2.218 4.041.284.982.434 1.998.495 3.017.044.743.044 1.491-.047 2.229-.149 1.27-.554 2.51-1.228 3.596a7.475 7.475 0 01-1.903 2.084c-1.244.928-2.877 1.482-4.436 1.114a3.916 3.916 0 01-.748-.258 4.692 4.692 0 01-.779-.45 6.08 6.08 0 01-1.244-1.105 6.507 6.507 0 01-1.049-1.747 7.366 7.366 0 01-.494-2.54c-.03-1.273.225-2.553.854-3.67a6.43 6.43 0 011.663-1.918c.225-.178.464-.333.704-.479l.016-.007a5.121 5.121 0 00-1.441-.12 4.963 4.963 0 00-1.228.24c-.359.12-.704.27-1.019.45a6.146 6.146 0 00-.733.494c-.211.18-.42.36-.615.555-1.123 1.153-1.768 2.682-2.022 4.256-.15.973-.15 1.96-.091 2.95.105 1.395.391 2.787.945 4.062a8.518 8.518 0 001.348 2.173 8.14 8.14 0 003.132 2.23 7.934 7.934 0 002.113.54c.074.015.149.015.209.015zm-2.934-.398a4.102 4.102 0 01-.45-.228 8.5 8.5 0 01-2.038-1.534c-1.094-1.137-1.827-2.566-2.247-4.08a15.184 15.184 0 01-.495-3.172 12.14 12.14 0 01.046-2.082c.135-1.257.495-2.501 1.124-3.58a6.889 6.889 0 011.783-2.053 6.23 6.23 0 011.633-.9 5.363 5.363 0 013.522-.045c.029 0 .029 0 .045.03.015.015.045.015.06.03.045.016.104.045.165.074.239.12.479.271.704.42a6.294 6.294 0 012.097 2.502c.42.914.615 1.934.631 2.938.014 1.079-.18 2.157-.645 3.146a6.42 6.42 0 01-2.638 2.832c.09.03.18.045.271.075.225.044.449.074.688.074 1.468.045 2.892-.66 3.94-1.647.195-.18.375-.375.54-.585.225-.27.435-.54.614-.823.239-.375.435-.75.614-1.154a8.112 8.112 0 00.509-1.664c.196-1.004.211-2.022.149-3.026-.135-2.022-.673-4.045-1.842-5.724a9.054 9.054 0 00-.555-.719 9.868 9.868 0 00-1.063-1.034 8.477 8.477 0 00-1.363-.915 9.927 9.927 0 00-1.692-.598l-.3-.06c-.209-.03-.42-.044-.634-.06a8.453 8.453 0 00-1.015.016c-.704.045-1.412.16-2.112.337C5.799 1.227 2.863 3.566 1.3 6.67A11.834 11.834 0 00.238 9.801a11.81 11.81 0 00-.104 3.775c.12 1.02.374 2.023.778 2.977.227.57.511 1.124.825 1.648 1.094 1.783 2.683 3.236 4.51 4.24.688.39 1.408.69 2.157.944.226.074.45.15.689.21z" />
              </svg>
              <span class="text-xs md:sr-only">Export to JSON</span>
            </button>

            <button
              type="button"
              onClick={() => exportToCsb(props.tabs)}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Export to CodeSandbox"
            >
              <svg
                class="fill-current h-6 px-[1.63px] py-0"
                preserveAspectRatio="xMidYMid"
                viewBox="0 0 256 296"
              >
                <path d="M115 261V154l-91-52v61l42 24v46l49 28zm24 1l51-29v-47l42-25v-60l-93 54v107zm81-181l-49-28-43 24-43-24-49 28 92 53 92-53zM0 222V74L128 0l128 74v148l-128 74L0 222z" />
              </svg>
              <span class=" text-xs md:sr-only">Export to CodeSandbox</span>
            </button>

            <button
              type="button"
              onClick={shareLink}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded"
              classList={{
                'opacity-80 hover:opacity-100': !copy(),
                'text-green-100': copy() && !showMenu(),
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Share with a minified link"
            >
              <Icon class="h-6" path={copy() ? link : share} />
              <span class="text-xs md:sr-only">{copy() ? 'Copied to clipboard' : 'Share'}</span>
            </button>
            <ZoomDropdown showMenu={showMenu()} />
          </div>
        </div>
        <button
          type="button"
          id="menu-btn"
          classList={{
            'border-white border': showMenu(),
          }}
          class="z-40 px-3 py-2 focus:outline-none focus:ring-1 rounded text-white opacity-80 hover:opacity-100 visible relative md:hidden m-0 mr-[10px]"
          title="Mobile Menu Button"
          onClick={() => setShowMenu(!showMenu())}
        >
          <Show when={showMenu()} fallback={<Icon path={menu} class="h-6 w-6" />}>
            <Icon path={xCircle} class="h-[22px] w-[22px]" /* adjusted to account for border */ />
          </Show>
          <span class="sr-only text-black md:text-white">Export to JSON</span>
        </button>
        <select
          name="version"
          id="version"
          onClick={(e) => setShowMenu(false)}
          class="-mb-1 leading-snug text-white bg-transparent border-transparent hover:border-white cursor-pointer"
          style={`background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}
          onChange={(e) => props.onVersionChange(e.currentTarget.value)}
          value={props.version}
        >
          <For each={versions()}>
            {(version) => (
              <option class="text-black cursor-pointer" value={version}>
                v{version}
              </option>
            )}
          </For>
        </select>
      </div>
    </header>
  );
};
