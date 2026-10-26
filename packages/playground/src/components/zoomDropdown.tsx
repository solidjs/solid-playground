import { createEffect, createUniqueId, Show, untrack, type Component } from 'solid-js';
import * as popover from '@zag-js/popover';
import { Icon, useMachine, useZoom, Button, Checkbox } from 'solid-repl/src/internal';
import { magnifyingGlassPlus, minus, plus } from '../icons';
import { css } from 'styled-system/css';

const popupDuration = 1250;

const popoverPanel = css({
  zIndex: 10,
  width: 'min-content',
  p: 4,
  rounded: 'lg',
  shadow: 'lg',
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900' },
});

const stepperBtn = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 1.5,
  borderWidth: '1px',
  borderColor: 'neutral.200',
  _hover: { bg: 'neutral.100' },
  _dark: { borderColor: 'neutral.700', _hover: { bg: 'neutral.800' } },
});

const valueBox = css({
  width: 20,
  px: 3,
  py: 1,
  borderTopWidth: '1px',
  borderBottomWidth: '1px',
  borderColor: 'neutral.200',
  textAlign: 'center',
  fontSize: 'sm',
  fontVariantNumeric: 'tabular-nums',
  _dark: { borderColor: 'neutral.700' },
});

export const ZoomDropdown: Component<{ showMenu: boolean }> = (props) => {
  const { zoomState, updateZoom, setOverrideNative, setScaleIframe } = useZoom();

  const id = createUniqueId();
  const { api } = useMachine(
    popover.machine,
    () => ({ id, portalled: false, positioning: { placement: 'bottom-end' as const } }),
    popover.connect,
  );

  createEffect(
    () => zoomState.zoom,
    () => {
      untrack(api).setOpen(true);
      const timeoutId = window.setTimeout(() => api().setOpen(false), popupDuration);
      return () => window.clearTimeout(timeoutId);
    },
    { defer: true },
  );

  return (
    <>
      <Button
        {...api().getTriggerProps()}
        type="button"
        mobile={props.showMenu}
        class={{ [css({ bg: 'gray.300', _dark: { color: 'black' } })]: api().open && props.showMenu }}
        title="Scale editor to make text larger or smaller"
      >
        <Icon class={css({ h: 6 })} path={magnifyingGlassPlus} />
        <span class={css({ fontSize: 'sm', md: { srOnly: true } })}>Scale Editor</span>
      </Button>
      <Show when={api().open}>
        <div {...api().getPositionerProps()}>
          <div {...api().getContentProps()} class={popoverPanel}>
            <div class={css({ display: 'flex', alignItems: 'center' })}>
              <button
                class={[stepperBtn, css({ roundedLeft: 'md' })]}
                aria-label="decrease font size"
                onClick={() => updateZoom('decrease')}
              >
                <Icon path={minus} class={css({ h: 4, w: 4 })} />
              </button>
              <div class={valueBox}>{zoomState.zoom}%</div>
              <button
                class={[stepperBtn, css({ roundedRight: 'md', mr: 4 })]}
                aria-label="increase font size"
                onClick={() => updateZoom('increase')}
              >
                <Icon path={plus} class={css({ h: 4, w: 4 })} />
              </button>
              <button
                class={css({
                  px: 3,
                  py: 1,
                  rounded: 'md',
                  borderWidth: '1px',
                  borderColor: 'neutral.200',
                  fontSize: 'sm',
                  _hover: { bg: 'neutral.100' },
                  _dark: { borderColor: 'neutral.700', _hover: { bg: 'neutral.800' } },
                })}
                aria-label="reset font size"
                onClick={() => updateZoom('reset')}
              >
                Reset
              </button>
            </div>
            <div class={css({ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 })}>
              <Checkbox
                label="Override browser zoom keyboard shortcut"
                checked={zoomState.overrideNative}
                onChange={(e) => setOverrideNative(e.currentTarget.checked)}
              />
              <Checkbox
                label="Scale iframe result"
                checked={zoomState.scaleIframe}
                onChange={(e) => setScaleIframe(e.currentTarget.checked)}
              />
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};
