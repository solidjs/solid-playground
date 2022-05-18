import Dismiss from 'solid-dismiss';
import { Icon } from 'solid-heroicons';
import { Component, onCleanup, createSignal, Show } from 'solid-js';
import { download, xCircle, menu, moon, sun } from 'solid-heroicons/outline';

import logo from '../assets/logo.svg?url';
import type { Tab } from '../../src';
import { exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import { useAppContext } from '../context';

export const Header: Component<{
  dark: boolean;
  toggleDark: () => void;
  tabs: Tab[];
}> = (props) => {
  const context = useAppContext()!;
  const [showMenu, setShowMenu] = createSignal(false);
  let menuBtnEl!: HTMLButtonElement;

  window.addEventListener('resize', closeMobileMenu);
  onCleanup(() => {
    window.removeEventListener('resize', closeMobileMenu);
  });

  function closeMobileMenu() {
    setShowMenu(false);
  }

  return (
    <header class="p-1 flex text-sm justify-between items-center border-slate-200 dark:border-neutral-800 border-b-2px">
      <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest pl-1">
        <a href="https://github.com/solidjs/solid">
          <img src={logo} alt="solid-js logo" class="w-8" />
        </a>
        <span class="inline-block -mb-1">
          Solid<b>JS</b> Playground
        </span>
      </h1>
      <div class="flex items-center">
        <Dismiss
          classList={{ 'absolute top-[53px] right-[10px] w-[fit-content] z-10': showMenu() }}
          menuButton={() => menuBtnEl}
          open={showMenu}
          setOpen={setShowMenu}
          show
        >
          <div
            class="md:items-center md:space-x-2 md:flex md:flex-row"
            classList={{
              'shadow-md flex flex-col justify-center bg-white dark:bg-solid-darkbg': showMenu(),
              hidden: !showMenu(),
            }}
          >
            <button
              type="button"
              onClick={props.toggleDark}
              class="flex flex-row space-x-2 items-center md:px-1 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
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
              class="flex flex-row space-x-2 items-center md:px-1 px-2 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
                  showMenu(),
              }}
              title="Export to Zip"
            >
              <Icon path={download} class="h-6" style={{ margin: '0' }} />
              <span class="text-xs md:sr-only">Export to Zip</span>
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
          class="px-3 py-2 focus:outline-none focus:ring-1 rounded opacity-80 hover:opacity-100 visible relative md:hidden m-0 mr-[10px]"
          title="Mobile Menu Button"
          ref={menuBtnEl}
        >
          <Show when={showMenu()} fallback={<Icon path={menu} class="h-6 w-6" />}>
            <Icon path={xCircle} class="h-[22px] w-[22px]" /* adjusted to account for border */ />
          </Show>
          <span class="sr-only">Show menu</span>
        </button>
        <div class="mx-5 -mb-1 leading-snug cursor-pointer">
          <Show
            when={context.user()?.display}
            fallback={
              <a href={`https://api.solidjs.com/auth/login?redirect=${window.location.origin}/login?auth=success`}>
                Login
              </a>
            }
          >
            {(x) => x}
          </Show>
        </div>
      </div>
    </header>
  );
};
