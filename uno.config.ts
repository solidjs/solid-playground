import { presetWind } from '@unocss/preset-wind3';
import { transformerDirectives, defineConfig } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      lightbg: '#ebeced',
      darkerbg: '#111111',
      darkbg: '#1e1e1e',
      darkLighterBg: '#444444',
      darkgray: '#252525',
      mediumgray: '#9d9d9d',
      lightgray: '#f3f5f7',
      dark: '#07254A',
      medium: '#446b9e',
      bord: 'rgba(128, 128, 128, 0.35)',
      solidc: '#2c4f7c',
    },
  },
  presets: [presetWind()],
  transformers: [transformerDirectives()],
});
