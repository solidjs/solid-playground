import { Component, Setter } from 'solid-js';
import { Label } from './ui/Label';
import { Input } from './ui/Input';

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

interface CompileModeProps {
  mode: (typeof compileOptions)[keyof typeof compileOptions];
  setMode: Setter<(typeof compileOptions)[keyof typeof compileOptions]>;
  universalModuleName: string;
  setUniversalModuleName: Setter<string>;
}

export const CompileMode: Component<CompileModeProps> = (props) => {
  return (
    <div class="p-2">
      <Label class="mb-1 block">Compile mode</Label>

      <div class="mt-1 space-y-1 text-sm">
        {(['DOM', 'SSR', 'HYDRATABLE'] as const).map((m) => (
          <label class="space-x-2 mr-auto block cursor-pointer">
            <input
              checked={props.mode === compileOptions[m]}
              class="text-solidc"
              onChange={[props.setMode, compileOptions[m]]}
              type="radio"
              name="dom"
            />
            <span>
              {m === 'DOM'
                ? 'Client side rendering'
                : m === 'SSR'
                  ? 'Server side rendering'
                  : 'Client side rendering with hydration'}
            </span>
          </label>
        ))}

        <label class="space-x-2 mr-auto block cursor-pointer">
          <input
            checked={props.mode.generate === 'universal'}
            class="text-solidc"
            onChange={[props.setMode, compileOptions.UNIVERSAL]}
            type="radio"
            name="dom"
          />
          <span>Universal Rendering & moduleName:</span>
          <Input
            onFocus={[props.setMode, compileOptions.UNIVERSAL]}
            onInput={(e) => {
              props.setUniversalModuleName(e.currentTarget.value);
            }}
            class="!py-1 ml-2 border-b-1 inline-block w-auto !text-xs"
            type="text"
            value={props.universalModuleName}
            name="moduleName"
          />
        </label>
      </div>
    </div>
  );
};
