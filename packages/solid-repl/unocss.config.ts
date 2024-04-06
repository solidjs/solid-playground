import { presetWind, theme } from '@unocss/preset-wind';
import { transformerDirectives, defineConfig } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      brand: {
        default: '#2c4f7c',
        dark: '#335d92',
        medium: '#446b9e',
        light: '#4f88c6',
      },
      solid: {
        default: '#2c4f7c',
        darkbg: '#222222',
        darkLighterBg: '#444444',
        darkdefault: '#b8d7ff',
        darkgray: '#252525',
        gray: '#414042',
        mediumgray: '#9d9d9d',
        lightgray: '#f3f5f7',
        dark: '#07254A',
        medium: '#446b9e',
        light: '#4f88c6',
        accent: '#0cdc73',
        secondaccent: '#0dfc85',
      },
      other: '#1e1e1e',
    },
    fontFamily: {
      sans: 'Gordita, ' + theme.fontFamily!.sans,
    },
  },
  presets: [presetWind()],
  transformers: [transformerDirectives()],
});
