import { createUniqueId, For, Show, type Component, type Setter } from 'solid-js';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { css } from 'styled-system/css';

export interface SolidCompileOptions {
  generate: string;
  hydratable: boolean;
  moduleName?: string;
}

export const compileOptions = {
  SSR: { generate: 'ssr', hydratable: true },
  DOM: { generate: 'dom', hydratable: false },
  HYDRATABLE: { generate: 'dom', hydratable: true },
  UNIVERSAL: {
    generate: 'universal',
    hydratable: false,
    moduleName: 'solid-universal-module' as string,
  },
} as const;

export type CompileModeOption = (typeof compileOptions)[keyof typeof compileOptions];

const labels = {
  DOM: 'Client side rendering',
  SSR: 'Server side rendering',
  HYDRATABLE: 'Client side rendering with hydration',
  UNIVERSAL: 'Universal rendering',
} as const;

const modes = ['DOM', 'SSR', 'HYDRATABLE', 'UNIVERSAL'] as const;

const toolbar = css({
  display: 'flex',
  flex: 'none',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 2,
  px: 2,
  py: 1,
  bg: 'white',
  _dark: { bg: 'neutral.900' },
});

const modeSelect = css({
  flex: '1 1 12rem',
  minW: 0,
  maxW: 'full',
  fontSize: 'sm',
  color: 'inherit',
  bg: 'transparent',
  border: '1px solid',
  borderColor: 'neutral.200',
  rounded: 'md',
  px: 2,
  py: 1,
  _dark: { borderColor: 'neutral.700' },
  _focusVisible: { outline: '2px solid', outlineColor: 'solidc', outlineOffset: '2px' },
});

interface CompileModeProps {
  mode: CompileModeOption;
  setMode: Setter<CompileModeOption>;
  universalModuleName: string;
  setUniversalModuleName: Setter<string>;
}

export const CompileMode: Component<CompileModeProps> = (props) => {
  const modeId = createUniqueId();
  const moduleId = createUniqueId();

  return (
    <div class={toolbar}>
      <Label for={modeId} class={css({ srOnly: true })}>
        Compile mode
      </Label>
      <select
        id={modeId}
        class={modeSelect}
        value={modes.find((mode) => props.mode === compileOptions[mode]) ?? 'UNIVERSAL'}
        onChange={(event) => props.setMode(compileOptions[event.currentTarget.value as (typeof modes)[number]])}
      >
        <For each={modes}>{(mode) => <option value={mode}>{labels[mode]}</option>}</For>
      </select>
      <Show when={props.mode.generate === 'universal'}>
        <Label for={moduleId} class={css({ srOnly: true })}>
          Module name
        </Label>
        <Input
          id={moduleId}
          onInput={(event) => props.setUniversalModuleName(event.currentTarget.value)}
          size="sm"
          class={css({ flex: '1 1 12rem', minW: 0, maxW: 'full' })}
          type="text"
          placeholder="Module name"
          value={props.universalModuleName}
          name="moduleName"
        />
      </Show>
    </div>
  );
};
