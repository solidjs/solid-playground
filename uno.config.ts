import { presetWind } from '@unocss/preset-wind3';
import { transformerDirectives, defineConfig } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      dark: '#07254A',
      medium: '#446b9e',
      solidc: '#2c4f7c',
    },
  },
  presets: [presetWind()],
  transformers: [transformerDirectives()],
});
