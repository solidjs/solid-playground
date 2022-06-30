import Dismiss from 'solid-dismiss';
import { Icon } from 'solid-heroicons';
import { onCleanup, createSignal, Show, ParentComponent } from 'solid-js';
import { share, link, download, xCircle, menu, moon, sun } from 'solid-heroicons/outline';
import { exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import { API, useAppContext } from '../context';

import logo from '../assets/logo.svg?url';

export const Header: ParentComponent<{ fork?: () => void; share: () => Promise<string> }> = (props) => {
  const [copy, setCopy] = createSignal(false);
  const context = useAppContext()!;
  const [showMenu, setShowMenu] = createSignal(false);
  let menuBtnEl!: HTMLButtonElement;

  function shareLink() {
    props.share().then((url) => {
      navigator.clipboard.writeText(url).then(() => {
        setCopy(true);
        setTimeout(setCopy, 750, false);
      });
    });
  }

  window.addEventListener('resize', closeMobileMenu);
  onCleanup(() => {
    window.removeEventListener('resize', closeMobileMenu);
  });

  function closeMobileMenu() {
    setShowMenu(false);
  }

  return (
    <header class="sticky top-0 z-10 bg-white dark:bg-solid-darkbg p-1 flex text-sm justify-between items-center border-slate-200 dark:border-neutral-800 border-b-2px">
      <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest pl-1">
        <a href="/">
          <img src={logo} alt="solid-js logo" class="w-8" />
        </a>
        <div id="project-name">
          {props.children || (
            <span class="inline-block">
              Solid<b>JS</b> Playground
            </span>
          )}
        </div>
      </h1>
      <div class="flex items-center gap-3 mr-2">
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
              'hidden': !showMenu(),
            }}
          >
            <button
              type="button"
              onClick={context.toggleDark}
              class="flex flex-row space-x-2 items-center md:px-1 px-2 py-2 rounded opacity-80 hover:opacity-100"
              classList={{
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
              }}
              title="Toggle dark mode"
            >
              <Show when={context.dark()} fallback={<Icon path={moon} class="h-6" />}>
                <Icon path={sun} class="h-6" />
              </Show>
              <span class="text-xs md:sr-only">{context.dark() ? 'Light' : 'Dark'} mode</span>
            </button>

            <Show when={context.tabs()}>
              <button
                type="button"
                onClick={() => exportToZip(context.tabs()!)}
                class="flex flex-row space-x-2 items-center md:px-1 px-2 py-2 rounded opacity-80 hover:opacity-100"
                classList={{
                  'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
                }}
                title="Export to Zip"
              >
                <Icon path={download} class="h-6" style={{ margin: '0' }} />
                <span class="text-xs md:sr-only">Export to Zip</span>
              </button>
            </Show>

            <ZoomDropdown showMenu={showMenu()} />

            <button
              type="button"
              onClick={shareLink}
              class="flex flex-row space-x-2 items-center md:px-1 px-2 py-2 rounded"
              classList={{
                'opacity-80 hover:opacity-100': !copy(),
                'text-green-100': copy() && !showMenu(),
                'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
              }}
              title="Share with a minified link"
            >
              <Icon class="h-6" path={copy() ? link : share} />
              <span class="text-xs md:sr-only">{copy() ? 'Copied to clipboard' : 'Share'}</span>
            </button>
          </div>
        </Dismiss>
        <button
          type="button"
          id="menu-btn"
          classList={{
            'border-white border': showMenu(),
          }}
          class="px-3 py-2 rounded opacity-80 hover:opacity-100 visible relative md:hidden m-0"
          title="Mobile Menu Button"
          ref={menuBtnEl}
        >
          <Show when={showMenu()} fallback={<Icon path={menu} class="h-6 w-6" />}>
            <Icon path={xCircle} class="h-[22px] w-[22px]" /* adjusted to account for border */ />
          </Show>
          <span class="sr-only">Show menu</span>
        </button>
        <div class="leading-snug cursor-pointer">
          <Show
            when={context.user()?.avatar}
            fallback={
              <a
                class="mx-1 bg-solid-default py-2 px-3 rounded text-lg"
                href={`${API}/auth/login?redirect=${window.location.origin}/login?auth=success`}
                rel="external"
              >
                Login
              </a>
            }
          >
            {(x) => (
              <a href="/">
                <img crossOrigin="anonymous" src={x} class="w-8 h-8 rounded-full" />
              </a>
            )}
          </Show>
        </div>
      </div>
    </header>
  );
};
