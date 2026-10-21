import {
  Loading,
  Show,
  children,
  createSignal,
  createUniqueId,
  onSettled,
  type Component,
  type ParentComponent,
} from 'solid-js';
import * as popover from '@zag-js/popover';
import { Icon } from 'solid-repl/src/components/ui/icon';
import { useMachine } from 'solid-repl/src/components/ui/zag';
import { share, link, arrowDownTray, xCircle, bars_3, moon, sun, github } from '../icons';
import { exportToZip } from '../utils/exportFiles';
import { ZoomDropdown } from './zoomDropdown';
import { VersionDropdown } from './versionDropdown';
import { API, useAppContext } from '../context';
import { Button, LinkButton } from 'solid-repl/src/components/ui/Button';
import { useMenu } from 'solid-repl/src/components/ui/Menu';
import { css } from 'styled-system/css';

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

const desktopMenuList = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 2,
});

const mobileMenuPanel = css({
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
  share: () => Promise<string>;
  solidVersion?: string;
  onSolidVersionChange?: (version: string) => void;
}> = (props) => {
  const [copy, setCopy] = createSignal(false);
  const context = useAppContext()!;
  const resolved = children(() => props.children);
  // Pages pass optional title content (possibly wrapped in Loading/Show); fall back to the
  // default title when it renders nothing.
  const hasTitle = () => resolved.toArray().some((node) => node != null && node !== '');
  const mql = window.matchMedia('(max-width: 767px)');
  const [isMobile, setIsMobile] = createSignal(mql.matches);
  onSettled(() => {
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  });

  const mobileMenuId = createUniqueId();
  const { api: mobileApi } = useMachine(
    popover.machine,
    () => ({ id: mobileMenuId, portalled: false, positioning: { placement: 'bottom-end' as const } }),
    popover.connect,
  );

  const profile = useMenu(
    () => [
      {
        value: 'profile',
        label: context.user().display,
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
      <a href={`/${context.profile()}`}>
        <img src={logo} alt="solid-js logo" class={css({ w: 8 })} />
      </a>
      {hasTitle() ? (
        resolved()
      ) : (
        <h1 class={titleStyles}>
          Solid<b>JS</b> Playground
        </h1>
      )}
      <div class={css({ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 })}>
        <Show
          when={isMobile()}
          fallback={
            <div class={desktopMenuList}>
              <HeaderMenuItems
                copy={copy()}
                shareLink={shareLink}
                showOnMobile={false}
                solidVersion={props.solidVersion}
                onSolidVersionChange={props.onSolidVersionChange}
              />
            </div>
          }
        >
          <Show when={mobileApi().open}>
            <div {...mobileApi().getPositionerProps()}>
              <div {...mobileApi().getContentProps()} class={mobileMenuPanel}>
                <HeaderMenuItems
                  copy={copy()}
                  shareLink={shareLink}
                  showOnMobile
                  solidVersion={props.solidVersion}
                  onSolidVersionChange={props.onSolidVersionChange}
                />
              </div>
            </div>
          </Show>
          <Button
            {...mobileApi().getTriggerProps()}
            type="button"
            class={{ [css({ borderWidth: '1px', borderColor: 'white' })]: mobileApi().open }}
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
            when={context.user().avatar}
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
            <button {...profile.api().getTriggerProps()}>
              <img crossorigin="anonymous" src={context.user().avatar} class={css({ h: 8, w: 8, rounded: 'full' })} />
            </button>
            <profile.Content />
          </Show>
        </div>
      </div>
    </header>
  );
};

const HeaderMenuItems: Component<{
  copy: boolean;
  shareLink: () => void;
  showOnMobile: boolean;
  solidVersion?: string;
  onSolidVersionChange?: (version: string) => void;
}> = (props) => {
  const context = useAppContext()!;
  return (
    <>
      <Button onClick={context.toggleDark} mobile={props.showOnMobile} title="Toggle dark mode">
        <Show when={context.dark()} fallback={<Icon path={moon} class={css({ h: 6 })} />}>
          <Icon path={sun} class={css({ h: 6 })} />
        </Show>
        <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>{context.dark() ? 'Light' : 'Dark'} mode</span>
      </Button>

      {/* The page's tabs may still be loading: show the button once a page provides them and read
          them only on click, so the header never waits for them. */}
      <Show when={context.hasTabs()}>
        <Button onClick={() => exportToZip(context.tabs()!)} mobile={props.showOnMobile} title="Export to Zip">
          <Icon path={arrowDownTray} class={css({ h: 6, m: 0 })} />
          <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>Export to Zip</span>
        </Button>
      </Show>

      <Show when={props.onSolidVersionChange}>
        {(onChange) => (
          <Loading>
            <VersionDropdown
              version={props.solidVersion ?? ''}
              onChange={(v) => onChange()(v)}
              showOnMobile={props.showOnMobile}
            />
          </Loading>
        )}
      </Show>

      <ZoomDropdown showMenu={props.showOnMobile} />

      <Button
        onClick={props.shareLink}
        mobile={props.showOnMobile}
        class={props.copy ? css({ color: 'green.100' }) : css({ opacity: 0.8, _hover: { opacity: 1 } })}
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
        mobile={props.showOnMobile}
        class={css({ cursor: 'alias' })}
        title="Github"
      >
        <Icon viewBox="0 0 96 96" class={css({ h: 6 })} path={github} />
        <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>Github</span>
      </LinkButton>
    </>
  );
};
