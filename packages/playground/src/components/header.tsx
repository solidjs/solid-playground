import { A } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { unwrap } from 'solid-js/store';
import { ParentComponent, Show, children, createMemo, createSignal, createUniqueId, onCleanup } from 'solid-js';
import { share, link, arrowDownTray, xCircle, bars_3, moon, sun } from 'solid-heroicons/outline';
import * as popover from '@zag-js/popover';
import { useMachine, normalizeProps } from '@zag-js/solid';
import { exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import { API, useAppContext } from '../context';
import { Button, LinkButton } from 'solid-repl/src/components/ui/Button';
import { useMenu } from 'solid-repl/src/components/ui/Menu';
import { css, cx } from 'styled-system/css';

import logo from '../assets/logo.svg?url';

const headerStyles = css({
  position: 'sticky',
  top: 0,
  zIndex: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  p: 1,
  px: 2,
  fontSize: 'sm',
  bg: 'neutral.100',
  _dark: { bg: 'neutral.950' },
});

const titleStyles = css({
  lineHeight: 0,
  letterSpacing: 'widest',
  textTransform: 'uppercase',
});

const menuButtonOnMobile = css({
  rounded: 'none',
  _active: { bg: 'gray.300' },
  _hover: { bg: 'gray.300', _dark: { color: 'black' } },
});

const desktopMenuList = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 2,
});

const mobileMenuPanel = css({
  position: 'absolute',
  top: '53px',
  right: '10px',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  width: 'fit-content',
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  rounded: 'lg',
  shadow: 'lg',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900' },
});

const profileButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  flexShrink: 0,
  cursor: 'pointer',
  lineHeight: 'snug',
});

const loginLink = css({
  mx: 1,
  px: 3,
  py: 1.5,
  rounded: 'md',
  bg: 'solidc',
  color: 'white',
  fontSize: 'sm',
  _hover: { bg: 'solidc/90' },
});

export const Header: ParentComponent<{
  compiler?: Worker;
  fork?: () => void;
  share: () => Promise<string>;
}> = (props) => {
  const [copy, setCopy] = createSignal(false);
  const context = useAppContext()!;
  const resolved = children(() => props.children);
  const [isMobile, setIsMobile] = createSignal(window.innerWidth < 768);
  const onResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', onResize);
  onCleanup(() => window.removeEventListener('resize', onResize));

  const mobileMenu = useMachine(popover.machine, {
    id: createUniqueId(),
    portalled: false,
  });
  const mobileApi = createMemo(() => popover.connect(mobileMenu, normalizeProps));

  const profile = useMenu(
    () => [
      {
        value: 'profile',
        label: context.user()?.display ?? '',
        onSelect: () => {
          window.location.href = `/${context.profile()}`;
        },
      },
      {
        value: 'sign-out',
        label: 'Sign Out',
        onSelect: () => {
          context.token = '';
        },
      },
    ],
    { positioning: { placement: 'bottom-end' } },
  );

  function shareLink() {
    props.share().then((url) => {
      navigator.clipboard.writeText(url).then(() => {
        setCopy(true);
        setTimeout(setCopy, 750, false);
      });
    });
  }

  return (
    <header class={headerStyles}>
      <A href={`/${context.profile()}`}>
        <img src={logo} alt="solid-js logo" class={css({ w: 8 })} />
      </A>
      {resolved() || (
        <h1 class={titleStyles}>
          Solid<b>JS</b> Playground
        </h1>
      )}
      <div class={css({ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 })}>
        <Show
          when={isMobile()}
          fallback={
            <div class={desktopMenuList}>
              <HeaderMenuItems copy={copy()} shareLink={shareLink} showOnMobile={false} />
            </div>
          }
        >
          <Show when={mobileApi().open}>
            <div {...(mobileApi().getPositionerProps() as any)}>
              <div {...(mobileApi().getContentProps() as any)} class={mobileMenuPanel}>
                <HeaderMenuItems copy={copy()} shareLink={shareLink} showOnMobile />
              </div>
            </div>
          </Show>
          <Button
            {...(mobileApi().getTriggerProps() as any)}
            type="button"
            class={cx(mobileApi().open && css({ borderWidth: '1px', borderColor: 'white' }))}
            variant="ghost"
            title="Mobile Menu Button"
          >
            <Show when={mobileApi().open} fallback={<Icon path={bars_3} class={css({ h: 6, w: 6 })} />}>
              <Icon path={xCircle} class={css({ h: '22px', w: '22px' })} />
            </Show>
            <span class={css({ srOnly: true })}>Show menu</span>
          </Button>
        </Show>

        <div class={profileButtonStyles}>
          <Show
            when={context.user()?.avatar}
            fallback={
              <a
                class={loginLink}
                href={`${API}/auth/login?redirect=${window.location.origin}/login?auth=success`}
                rel="external"
              >
                Login
              </a>
            }
          >
            <button {...(profile.api().getTriggerProps() as any)}>
              <img crossOrigin="anonymous" src={context.user()?.avatar} class={css({ h: 8, w: 8, rounded: 'full' })} />
            </button>
            <profile.Content />
          </Show>
        </div>
      </div>
    </header>
  );
};

const HeaderMenuItems: ParentComponent<{
  copy: boolean;
  shareLink: () => void;
  showOnMobile: boolean;
}> = (props) => {
  const context = useAppContext()!;
  const mobileBtn = () => (props.showOnMobile ? menuButtonOnMobile : '');
  return (
    <>
      <Button onClick={context.toggleDark} class={mobileBtn()} title="Toggle dark mode">
        <Show when={context.dark()} fallback={<Icon path={moon} class={css({ h: 6 })} />}>
          <Icon path={sun} class={css({ h: 6 })} />
        </Show>
        <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>{context.dark() ? 'Light' : 'Dark'} mode</span>
      </Button>

      <Show when={context.tabs()}>
        <Button onClick={() => exportToZip(unwrap(context.tabs())!)} class={mobileBtn()} title="Export to Zip">
          <Icon path={arrowDownTray} class={css({ h: 6, m: 0 })} />
          <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>Export to Zip</span>
        </Button>
      </Show>

      <ZoomDropdown showMenu={props.showOnMobile} />

      <Button
        onClick={props.shareLink}
        class={cx(
          mobileBtn(),
          props.copy ? css({ color: 'green.100' }) : css({ opacity: 0.8, _hover: { opacity: 1 } }),
        )}
        title="Share with a minified link"
      >
        <Icon class={css({ h: 6 })} path={props.copy ? link : share} />
        <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>
          {props.copy ? 'Copied to clipboard' : 'Share'}
        </span>
      </Button>

      <LinkButton
        href="https://github.com/solidjs/solid-playground"
        target="_blank"
        class={cx(mobileBtn(), css({ cursor: 'alias' }))}
        title="Github"
      >
        <Icon
          viewBox="0 0 96 96"
          class={css({ h: 6 })}
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
        <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>Github</span>
      </LinkButton>
    </>
  );
};
