import { createSignal, onSettled, type Component } from 'solid-js';
import { DEFAULT_SOLID_VERSION } from 'solid-repl/src';
import { Icon, useMenu, Button } from 'solid-repl/src/internal';
import { check, cube } from '../icons';
import { css } from 'styled-system/css';

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

let packageInfo: Promise<{ tags: Record<string, string>; versions: string[] }> | undefined;

export const fetchSolidPackageInfo = () =>
  (packageInfo ??= fetch('https://data.jsdelivr.com/v1/package/npm/solid-js')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
    .catch((e) => {
      packageInfo = undefined;
      throw e;
    }));

const fetchVersions = async (): Promise<VersionOption[]> => {
  try {
    const { tags, versions } = await fetchSolidPackageInfo();
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
  const [options, setOptions] = createSignal<VersionOption[]>([]);
  onSettled(() => {
    void fetchVersions().then(setOptions);
  });

  const label = () => {
    if (!props.version) return 'Solid';
    const option = options().find((o) => o.value === props.version);
    if (option) return option.label;
    return props.version.includes('.') ? `v${props.version}` : props.version;
  };

  const menu = useMenu(
    () =>
      [{ value: '', label: `Bundled (v${DEFAULT_SOLID_VERSION})` }, ...options()].map((option) => ({
        value: option.value || 'default',
        label: option.label,
        icon: option.value === props.version ? check : undefined,
        onSelect: () => props.onChange(option.value),
      })),
    { positioning: { placement: 'bottom-end' } },
  );

  return (
    <>
      <Button {...menu.api().getTriggerProps()} type="button" mobile={props.showOnMobile} title="Switch Solid version">
        <Icon path={cube} class={css({ h: 6 })} />
        <span class={css({ fontSize: 'sm' })}>{label()}</span>
      </Button>
      <menu.Content />
    </>
  );
};
