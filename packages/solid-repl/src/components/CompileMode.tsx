import { Component, For, Setter } from 'solid-js';
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

const labels = {
  DOM: 'Client side rendering',
  SSR: 'Server side rendering',
  HYDRATABLE: 'Client side rendering with hydration',
} as const;

const radioRow = css({
  'display': 'block',
  'cursor': 'pointer',
  'mr': 'auto',
  '& > * + *': { ml: 2 },
});

interface CompileModeProps {
  mode: (typeof compileOptions)[keyof typeof compileOptions];
  setMode: Setter<(typeof compileOptions)[keyof typeof compileOptions]>;
  universalModuleName: string;
  setUniversalModuleName: Setter<string>;
}

export const CompileMode: Component<CompileModeProps> = (props) => {
  return (
    <div class={css({ p: 2 })}>
      <Label class={css({ mb: 1, display: 'block' })}>Compile mode</Label>

      <div class={css({ 'mt': 1, 'fontSize': 'sm', '& > * + *': { mt: 1 } })}>
        <For each={['DOM', 'SSR', 'HYDRATABLE'] as const}>
          {(m) => (
            <label class={radioRow}>
              <input
                checked={props.mode === compileOptions[m]}
                class={css({ accentColor: 'solidc' })}
                onChange={[props.setMode, compileOptions[m]]}
                type="radio"
                name="dom"
              />
              <span>{labels[m]}</span>
            </label>
          )}
        </For>

        <label class={radioRow}>
          <input
            checked={props.mode.generate === 'universal'}
            class={css({ accentColor: 'solidc' })}
            onChange={[props.setMode, compileOptions.UNIVERSAL]}
            type="radio"
            name="dom"
          />
          <span>Universal Rendering & moduleName:</span>
          <Input
            onFocus={[props.setMode, compileOptions.UNIVERSAL]}
            onInput={(e) => props.setUniversalModuleName(e.currentTarget.value)}
            size="sm"
            inline
            class={css({ ml: 2 })}
            type="text"
            value={props.universalModuleName}
            name="moduleName"
          />
        </label>
      </div>
    </div>
  );
};
