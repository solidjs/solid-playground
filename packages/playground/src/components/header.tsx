import Dismiss from 'solid-dismiss';
import { A } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { unwrap } from 'solid-js/store';
import { onCleanup, createSignal, Show, ParentComponent } from 'solid-js';
import { share, link, arrowDownTray, xCircle, bars_3, moon, sun } from 'solid-heroicons/outline';
import { exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import { API, useAppContext } from '../context';

import logo from '../assets/logo.svg?url';

export const Header: ParentComponent<{
  compiler?: Worker;
  fork?: () => void;
  share: () => Promise<string>;
}> = (props) => {
  const [copy, setCopy] = createSignal(false);
  const context = useAppContext()!;
  const [showMenu, setShowMenu] = createSignal(false);
  const [showProfile, setShowProfile] = createSignal(false);
  let menuBtnEl!: HTMLButtonElement;
  let profileBtn!: HTMLButtonElement;

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
    <header class="dark:bg-solid-darkbg border-b-2px sticky top-0 z-10 flex items-center gap-x-4 border-slate-200 bg-white p-1 px-2 text-sm dark:border-neutral-800">
      <A href="/">
        <img src={logo} alt="solid-js logo" class="w-8" />
      </A>
      {props.children || (
        <h1 class="leading-0 uppercase tracking-widest">
          Solid<b>JS</b> Playground
        </h1>
      )}
      <Dismiss
        classList={{
          'absolute top-[53px] right-[10px] w-[fit-content] z-10': showMenu(),
          'shadow-md flex flex-col justify-center bg-white dark:bg-solid-darkbg': showMenu(),
          'hidden': !showMenu(),
        }}
        class="ml-auto md:flex md:flex-row md:items-center md:space-x-2"
        menuButton={() => menuBtnEl}
        open={showMenu}
        setOpen={setShowMenu}
        show
      >
        <button
          type="button"
          onClick={context.toggleDark}
          class="flex flex-row items-center space-x-2 rounded px-2 py-2 opacity-80 hover:opacity-100 md:px-1"
          classList={{
            'rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
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
            onClick={() => exportToZip(unwrap(context.tabs())!)}
            class="flex flex-row items-center space-x-2 rounded px-2 py-2 opacity-80 hover:opacity-100 md:px-1"
            classList={{
              'rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
            }}
            title="Export to Zip"
          >
            <Icon path={arrowDownTray} class="h-6" style={{ margin: '0' }} />
            <span class="text-xs md:sr-only">Export to Zip</span>
          </button>
        </Show>

        <ZoomDropdown showMenu={showMenu()} />

        <button
          type="button"
          onClick={shareLink}
          class="flex flex-row items-center space-x-2 rounded px-2 py-2 md:px-1"
          classList={{
            'opacity-80 hover:opacity-100': !copy(),
            'text-green-100': copy() && !showMenu(),
            'rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
          }}
          title="Share with a minified link"
        >
          <Icon class="h-6" path={copy() ? link : share} />
          <span class="text-xs md:sr-only">{copy() ? 'Copied to clipboard' : 'Share'}</span>
        </button>
        <a
          href="https://github.com/solidjs/solid-playground"
          target="_blank"
          class="flex cursor-alias flex-row items-center space-x-2 rounded px-2 py-2 opacity-80 hover:opacity-100 md:px-1"
          classList={{
            'rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': showMenu(),
          }}
          title="Github"
        >
          <Icon
            viewBox="0 0 96 96"
            class="h-6"
            path={{
              path: (
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                />
              ),
              outline: false,
              mini: false,
            }}
          />
          <span class="text-xs md:sr-only">Github</span>
        </a>
      </Dismiss>
      <button
        type="button"
        classList={{
          'border-white border': showMenu(),
        }}
        class="visible relative ml-auto rounded px-3 py-2 opacity-80 hover:opacity-100 md:hidden"
        title="Mobile Menu Button"
        ref={menuBtnEl}
      >
        <Show when={showMenu()} fallback={<Icon path={bars_3} class="h-6 w-6" />}>
          <Icon path={xCircle} class="h-[22px] w-[22px]" /* adjusted to account for border */ />
        </Show>
        <span class="sr-only">Show menu</span>
      </button>
      <div class="relative h-8 cursor-pointer leading-snug">
        <Show
          when={context.user()?.avatar}
          fallback={
            <a
              class="bg-solid-default mx-1 rounded px-3 py-2 text-lg text-slate-50"
              href={`${API}/auth/login?redirect=${window.location.origin}/login?auth=success`}
              rel="external"
            >
              Login
            </a>
          }
        >
          <button ref={profileBtn}>
            <img crossOrigin="anonymous" src={context.user()?.avatar} class="h-8 w-8 rounded-full" />
          </button>
          <Dismiss menuButton={() => profileBtn} open={showProfile} setOpen={setShowProfile}>
            <div class="dark:bg-solid-darkbg absolute right-0 flex flex-col items-center justify-center bg-white shadow-md">
              <a class="px-2 py-2 hover:bg-gray-300 dark:hover:bg-gray-800" href="/">
                {context.user()?.display}
              </a>
              <button
                onClick={() => (context.token = '')}
                class="w-full px-2 py-2 text-left text-xs hover:bg-gray-300 dark:hover:bg-gray-800"
              >
                Sign Out
              </button>
            </div>
          </Dismiss>
        </Show>
      </div>
    </header>
  );
};
