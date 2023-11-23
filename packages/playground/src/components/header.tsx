import Dismiss from 'solid-dismiss';
import { A } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { unwrap } from 'solid-js/store';
import { onCleanup, createSignal, Show, ParentComponent, JSX } from 'solid-js';
import { share, link, arrowDownTray, bars_3, moon, sun } from 'solid-heroicons/outline';
import { exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import { API, useAppContext } from '../context';

import logo from '../assets/logo.svg?url';

export const HeaderButton = (props: {
  ref?: HTMLButtonElement;
  onClick?: () => void;
  title: string;
  classList?: Record<string, boolean>;
  children: JSX.Element;
}) => {
  return (
    <button
      ref={props.ref}
      type="button"
      onClick={props.onClick}
      class="m-1 mr-0 flex flex-row items-center space-x-2 rounded p-1 text-neutral-700 hover:bg-gray-200 dark:text-slate-200 dark:hover:bg-gray-700"
      classList={props.classList}
      title={props.title}
    >
      {props.children}
    </button>
  );
};

export const HeaderIcon = (props: {
  ref?: HTMLButtonElement;
  menu: boolean;
  onClick?: () => void;
  title: string;
  classList?: Record<string, boolean>;

  path: { path: JSX.Element; outline: boolean; mini: boolean };
  text: string;
}) => {
  return (
    <HeaderButton
      ref={props.ref}
      onClick={props.onClick}
      title={props.title}
      classList={{
        'rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': props.menu,
        ...props.classList,
        'm-0': true,
      }}
    >
      <Icon path={props.path} class="h-6" />
      <span class="sr-only text-xs">{props.text}</span>
    </HeaderButton>
  );
};
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
    <header class="dark:bg-darkbg border-b-1px border-bord sticky top-0 z-10 flex items-center bg-white text-sm">
      <A href="/">
        <img src={logo} alt="solid-js logo" class="mx-2 h-6" />
      </A>
      {props.children || (
        <h1 class="p-1 text-sm uppercase">
          Solid<b>JS</b> Playground
        </h1>
      )}
      <div class="relative ml-auto">
        <button
          type="button"
          classList={{
            'bg-gray-200 dark:bg-gray-700': showMenu(),
          }}
          class="visible hidden rounded p-1 opacity-80 hover:bg-gray-200 hover:opacity-100 dark:hover:bg-gray-700"
          title="Mobile Menu Button"
          ref={menuBtnEl}
        >
          <Icon path={bars_3} class="h-5 w-5" />
          <span class="sr-only">Show menu</span>
        </button>

        <Dismiss
          class="absolute relative  top-0 top-[28px] flex flex-row items-center"
          classList={{
            'z-10 w-40 right-0 absolute rounded border border-bord flex flex-col bg-white dark:bg-darkbg': showMenu(),
            'hidden': !showMenu(),
          }}
          menuButton={menuBtnEl}
          open={showMenu}
          setOpen={setShowMenu}
          show
        >
          <HeaderIcon
            menu={showMenu()}
            onClick={context.toggleDark}
            path={context.dark() ? sun : moon}
            text={`${context.dark() ? 'Light' : 'Dark'} mode`}
            title="Toggle Dark Mode"
          />
          <HeaderIcon
            menu={showMenu()}
            onClick={() => exportToZip(unwrap(context.tabs())!)}
            path={arrowDownTray}
            text="Export to Zip"
            title="Export to Zip"
          />

          <ZoomDropdown showMenu={showMenu()} />

          <HeaderIcon
            menu={showMenu()}
            onClick={shareLink}
            path={copy() ? link : share}
            text={copy() ? 'Copied to clipboard' : 'Share'}
            title="Share with a minified link"
            classList={{
              'text-green-100': copy() && !showMenu(),
            }}
          />
        </Dismiss>
      </div>
      <div class="relative ml-1 cursor-pointer">
        <Show
          when={context.user()?.avatar}
          fallback={
            <a
              class="rounded p-2 text-sm hover:bg-gray-200 hover:dark:bg-gray-700"
              href={`${API}/auth/login?redirect=${window.location.origin}/login?auth=success`}
              rel="external"
            >
              Login
            </a>
          }
        >
          <button ref={profileBtn} class="mr-1 rounded p-1 hover:bg-gray-200 hover:dark:bg-gray-700">
            <img crossOrigin="anonymous" src={context.user()?.avatar} class="h-6 w-6 rounded-full" />
          </button>
          <Dismiss menuButton={profileBtn} open={showProfile} setOpen={setShowProfile}>
            <div class="dark:bg-darkbg border-bord absolute right-0 top-[30px] flex flex-col items-center rounded border bg-white">
              <a class="p-2 hover:bg-gray-300 dark:hover:bg-gray-800" href="/">
                {context.user()?.display}
              </a>
              <button
                onClick={() => (context.token = '')}
                class="w-full p-2 text-left text-xs hover:bg-gray-300 dark:hover:bg-gray-800"
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
