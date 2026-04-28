import { Component, For, Show, createMemo, createSignal, createUniqueId } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Icon } from 'solid-heroicons';
import { magnifyingGlass } from 'solid-heroicons/outline';
import * as combobox from '@zag-js/combobox';
import { useMachine, normalizeProps } from '@zag-js/solid';
import { css, cva } from 'styled-system/css';

export interface CommandItem {
  id: string;
  label: string;
  icon?: any;
  shortcut?: string;
  group?: string;
  onSelect: () => void;
}

const itemStyle = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    px: 3,
    py: 1.5,
    gap: 2,
    textAlign: 'left',
    fontSize: 'sm',
    cursor: 'pointer',
    color: 'inherit',
    bg: 'transparent',
    outline: 'none',
    '&[data-highlighted]': { bg: 'neutral.200' },
    _dark: {
      '&[data-highlighted]': { bg: 'neutral.700' },
    },
  },
});

export function useCommandMenu(items: () => CommandItem[]) {
  const id = createUniqueId();
  const [query, setQuery] = createSignal('');
  const [position, setPosition] = createSignal({ x: 0, y: 0 });

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    return q ? items().filter((i) => i.label.toLowerCase().includes(q)) : items();
  });

  const grouped = createMemo(() => {
    const groups: { group: string; items: CommandItem[] }[] = [];
    const byName = new Map<string, CommandItem[]>();
    for (const item of filtered()) {
      const g = item.group ?? '';
      let bucket = byName.get(g);
      if (!bucket) {
        bucket = [];
        byName.set(g, bucket);
        groups.push({ group: g, items: bucket });
      }
      bucket.push(item);
    }
    return groups;
  });

  const collection = createMemo(() =>
    combobox.collection({
      items: filtered(),
      itemToValue: (item) => item.id,
      itemToString: (item) => item.label,
    }),
  );

  const service = useMachine(combobox.machine, () => ({
    id,
    collection: collection(),
    inputValue: query(),
    inputBehavior: 'autohighlight' as const,
    selectionBehavior: 'clear' as const,
    openOnClick: true,
    onInputValueChange: ({ inputValue }) => {
      setQuery(inputValue);
    },
    onOpenChange: ({ open }) => {
      if (!open) setQuery('');
    },
    onSelect: ({ itemValue }) => {
      const item = items().find((i) => i.id === itemValue);
      if (item) {
        api().setOpen(false);
        item.onSelect();
      }
    },
  }));
  const api = createMemo(() => combobox.connect(service, normalizeProps));

  const openAt = (x: number, y: number) => {
    setPosition({ x, y });
    setQuery('');
    api().setOpen(true);
    queueMicrotask(() => api().focus());
  };

  const Content: Component = () => (
    <Portal>
      <Show when={api().open}>
        <div
          {...(api().getRootProps() as any)}
          class={css({ position: 'fixed', zIndex: 2000 })}
          style={{ left: `${position().x}px`, top: `${position().y}px` }}
        >
          <div
            {...(api().getContentProps() as any)}
            class={css({
              width: '320px',
              maxHeight: '480px',
              bg: 'white',
              borderWidth: '1px',
              borderColor: 'neutral.200',
              rounded: 'lg',
              shadow: 'lg',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              fontSize: 'sm',
              color: 'neutral.900',
              outline: 'none',
              _dark: { bg: 'neutral.800', borderColor: 'neutral.700', color: 'white' },
            })}
          >
            <div
              {...(api().getControlProps() as any)}
              class={css({
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 3,
                py: 2,
                borderBottomWidth: '1px',
                borderColor: 'neutral.200',
                _dark: { borderColor: 'neutral.700' },
              })}
            >
              <Icon path={magnifyingGlass} class={css({ h: 4, w: 4, color: 'neutral.400' })} />
              <input
                {...(api().getInputProps() as any)}
                class={css({ flex: 1, bg: 'transparent', outline: 'none', fontSize: 'sm', color: 'inherit' })}
                placeholder="Search actions"
              />
            </div>
            <div {...(api().getListProps() as any)} class={css({ overflowY: 'auto', py: 1 })}>
              <Show
                when={filtered().length > 0}
                fallback={<div class={css({ p: 3, color: 'neutral.500', textAlign: 'center' })}>No results</div>}
              >
                <For each={grouped()}>
                  {(g) => (
                    <>
                      <Show when={g.group}>
                        <div
                          class={css({
                            px: 3,
                            pt: 2,
                            pb: 1,
                            fontSize: 'xs',
                            color: 'neutral.500',
                            _dark: { color: 'neutral.400' },
                          })}
                        >
                          {g.group}
                        </div>
                      </Show>
                      <For each={g.items}>
                        {(item) => (
                          <div {...(api().getItemProps({ item }) as any)} class={itemStyle()}>
                            <Show when={item.icon} fallback={<div class={css({ h: 4, w: 4 })} />}>
                              <Icon path={item.icon} class={css({ h: 4, w: 4, color: 'neutral.500' })} />
                            </Show>
                            <span class={css({ flex: 1 })}>{item.label}</span>
                            <Show when={item.shortcut}>
                              <kbd
                                class={css({
                                  fontSize: 'xs',
                                  color: 'neutral.500',
                                  borderWidth: '1px',
                                  borderColor: 'neutral.200',
                                  rounded: 'sm',
                                  px: 1.5,
                                  py: 0.5,
                                  fontFamily: 'mono',
                                  _dark: { borderColor: 'neutral.600', color: 'neutral.400' },
                                })}
                              >
                                {item.shortcut}
                              </kbd>
                            </Show>
                          </div>
                        )}
                      </For>
                    </>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );

  return { openAt, Content };
}
