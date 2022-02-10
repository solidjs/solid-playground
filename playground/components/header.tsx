import { Component, onCleanup, createSignal, Show, createMemo, For } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { share, link, download, xCircle, menu, moon, sun } from 'solid-heroicons/outline';
import Dismiss from 'solid-dismiss';

import logo from '../assets/logo.svg?url';
import type { Tab } from '../../src';
import { exportToCsb, exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import pkg from '../../package.json';

const SOLID_VERSION = pkg.dependencies['solid-js'];

export const Header: Component<{
  dark: boolean;
  toggleDark: () => void;
  formatCode: () => void;
  isHorizontal: boolean;
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => void;
  setCurrent: (tabId: string) => void;
  version: string;
  onVersionChange: (version: string) => void;
}> = (props) => {
  const [copy, setCopy] = createSignal(false);
  const [showMenu, setShowMenu] = createSignal(false);
  let menuBtnEl!: HTMLButtonElement;

  window.addEventListener('resize', closeMobileMenu);
  onCleanup(() => {
    window.removeEventListener('resize', closeMobileMenu);
  });

  function closeMobileMenu() {
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

  const versions = createMemo(() => {
    const hardCoded = ['0.26.5', '1.0.0', SOLID_VERSION];

    return hardCoded.includes(props.version) ? hardCoded : [props.version, ...hardCoded];
  });

  return (
    <header
      class="p-2 flex text-sm justify-between items-center bg-brand-default text-white"
      classList={{ 'md:col-span-3': !props.isHorizontal }}
    >
      <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest">
        <a href="https://github.com/solidjs/solid">
          <img src={logo} alt="solid-js logo" class="w-8" />
        </a>
        <span class="inline-block -mb-1">Solid Playground</span>
      </h1>
      <div class="flex items-center space-x-2">
        <Dismiss
          classList={{ 'absolute top-[53px] right-[10px] w-[fit-content] z-10': showMenu() }}
          menuButton={() => menuBtnEl}
          open={showMenu}
          setOpen={setShowMenu}
          show
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
              onClick={props.formatCode}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Format current document"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
              <span class="text-xs md:sr-only">Format current document</span>
            </button>

            <button
              type="button"
              onClick={props.toggleDark}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Toggle dark mode"
            >
              <Show when={props.dark} fallback={<Icon path={moon} class="h-6" />}>
                <Icon path={sun} class="h-6" />
              </Show>
              <span class="text-xs md:sr-only">{props.dark ? 'Light' : 'Dark'} mode</span>
            </button>

            <button
              type="button"
              onClick={() => exportToZip(props.tabs)}
              class="md:text-white flex flex-row space-x-2 items-center md:px-3 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Export to Zip"
            >
              <Icon path={download} class="h-6" style={{ margin: '0' }} />
              <span class="text-xs md:sr-only">Export to Zip</span>
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
        </Dismiss>
        <button
          type="button"
          id="menu-btn"
          classList={{
            'border-white border': showMenu(),
          }}
          class="px-3 py-2 focus:outline-none focus:ring-1 rounded text-white opacity-80 hover:opacity-100 visible relative md:hidden m-0 mr-[10px]"
          title="Mobile Menu Button"
          ref={menuBtnEl}
        >
          <Show when={showMenu()} fallback={<Icon path={menu} class="h-6 w-6" />}>
            <Icon path={xCircle} class="h-[22px] w-[22px]" /* adjusted to account for border */ />
          </Show>
          <span class="sr-only text-black md:text-white">Export to JSON</span>
        </button>
        <select
          name="version"
          id="version"
          onClick={() => setShowMenu(false)}
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
