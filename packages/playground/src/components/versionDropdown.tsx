import { Component, createResource } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { check, cube } from 'solid-heroicons/outline';
import { useMenu } from 'solid-repl/src/components/ui/Menu';
import { Button } from 'solid-repl/src/components/ui/Button';
import { css, cx } from 'styled-system/css';

const headerButtonOnMobile = css({
  rounded: 'none',
  _active: { bg: 'gray.300' },
  _hover: { bg: 'gray.300', _dark: { color: 'black' } },
});

interface VersionOption {
  value: string;
  label: string;
}

const buildOptions = (tags: Record<string, string>, versions: string[]): VersionOption[] => {
  const options: VersionOption[] = [];
  const seen = new Set<string>();

  for (const tag of ['next', 'latest']) {
    const version = tags[tag];
    if (!version || seen.has(version)) continue;
    seen.add(version);
    options.push({ value: tag, label: `v${version} (${tag})` });
  }

  const minors = new Set<string>();
  for (const v of versions) {
    if (options.length >= 10) break;
    if (v.includes('-') || v.startsWith('0.')) continue;
    const minor = v.split('.').slice(0, 2).join('.');
    if (minors.has(minor)) continue;
    minors.add(minor);
    if (seen.has(v)) continue;
    seen.add(v);
    options.push({ value: v, label: `v${v}` });
  }
  return options;
};

const fetchVersions = async (): Promise<VersionOption[]> => {
  try {
    const res = await fetch('https://data.jsdelivr.com/v1/package/npm/solid-js');
    if (!res.ok) throw new Error(res.statusText);
    const { tags, versions } = (await res.json()) as { tags: Record<string, string>; versions: string[] };
    return buildOptions(tags, versions);
  } catch (e) {
    console.error('Failed to fetch solid-js versions', e);
    return [];
  }
};

export const VersionDropdown: Component<{
  version: string;
  onChange: (version: string) => void;
  showOnMobile: boolean;
}> = (props) => {
  const [options] = createResource(fetchVersions, { initialValue: [] });

  const label = () => {
    if (!props.version) return 'Solid';
    const option = options().find((o) => o.value === props.version);
    if (option) return option.label;
    return props.version.includes('.') ? `v${props.version}` : props.version;
  };

  const menu = useMenu(
    () =>
      [{ value: '', label: 'Default (bundled)' }, ...options()].map((option) => ({
        value: option.value || 'default',
        label: option.label,
        icon: option.value === props.version ? check : undefined,
        onSelect: () => props.onChange(option.value),
      })),
    { positioning: { placement: 'bottom-end' } },
  );

  return (
    <>
      <Button
        {...menu.api().getTriggerProps()}
        type="button"
        class={cx(props.showOnMobile && headerButtonOnMobile)}
        title="Switch Solid version"
      >
        <Icon path={cube} class={css({ h: 6 })} />
        <span class={css({ fontSize: 'sm' })}>{label()}</span>
      </Button>
      <menu.Content />
    </>
  );
};
