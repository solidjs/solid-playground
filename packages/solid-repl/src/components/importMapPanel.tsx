import { Component, For, Show } from 'solid-js';
import { trash } from 'solid-heroicons/outline';
import { useRepl } from './replContext';
import { Input } from './ui/Input';
import { IconButton } from './ui/IconButton';
import { Label } from './ui/Label';
import { css } from 'styled-system/css';

const shell = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  h: 'full',
  overflowY: 'auto',
  px: 4,
  py: 3,
});

const header = css({ display: 'flex', flexDirection: 'column', gap: 1, pb: 1 });

const hint = css({ fontSize: 'xs', color: 'neutral.500', _dark: { color: 'neutral.400' } });

const row = css({ display: 'flex', alignItems: 'center', gap: 2 });

const packageName = css({
  flexShrink: 0,
  w: '44',
  fontSize: 'sm',
  fontFamily: 'mono',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const pinnedBadge = css({
  flexShrink: 0,
  px: 1.5,
  py: 0.5,
  rounded: 'sm',
  fontSize: 'xs',
  fontWeight: 'medium',
  bg: 'solidc/10',
  color: 'solidc',
  _dark: { bg: 'neutral.700', color: 'white' },
});

export const ImportMapPanel: Component = () => {
  const repl = useRepl();

  const names = () => Object.keys(repl.importMap().imports);
  const urlOf = (name: string) => repl.importMap().imports[name] ?? '';
  const isPinned = (name: string) => repl.importMap().pinned.includes(name);

  const commitUrl = (name: string, url: string) => {
    const trimmed = url.trim();
    if (trimmed && trimmed !== urlOf(name)) repl.setPackageUrl(name, trimmed);
  };

  const addPackage = (input: HTMLInputElement) => {
    const name = input.value.trim();
    if (!name || name in repl.importMap().imports) return;
    repl.addPackage(name);
    input.value = '';
  };

  return (
    <div class={shell}>
      <div class={header}>
        <Label>Packages</Label>
        <span class={hint}>Editing a URL pins the package. Delete a pinned row to restore the generated URL.</span>
      </div>
      <For each={names()}>
        {(name) => (
          <div class={row}>
            <span class={packageName} title={name}>
              {name}
            </span>
            <Input
              size="sm"
              class={css({ fontFamily: 'mono' })}
              value={urlOf(name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitUrl(name, e.currentTarget.value);
              }}
              onBlur={(e) => commitUrl(name, e.currentTarget.value)}
            />
            <Show when={isPinned(name)}>
              <span class={pinnedBadge}>pinned</span>
            </Show>
            <IconButton icon={trash} onClick={() => repl.removePackage(name)} title={`Remove ${name}`} />
          </div>
        )}
      </For>
      <div class={row}>
        <Input
          size="sm"
          placeholder="Add package (pinned), e.g. lodash-es"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addPackage(e.currentTarget);
          }}
        />
      </div>
    </div>
  );
};
