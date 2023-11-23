import { presetWind, theme } from '@unocss/preset-wind';
import { transformerDirectives, defineConfig } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      darkbg: '#1e1e1e',
      darkLighterBg: '#444444',
      darkgray: '#252525',
      gray: '#414042',
      mediumgray: '#9d9d9d',
      lightgray: '#f3f5f7',
      dark: '#07254A',
      medium: '#446b9e',
      light: '#4f88c6',
      bord: 'rgba(128, 128, 128, 0.35)',
      solid: {
        default: '#2c4f7c',
        darkdefault: '#b8d7ff',
        accent: '#0cdc73',
        secondaccent: '#0dfc85',
      },
    },
    fontFamily: {
      sans: 'Gordita, ' + theme.fontFamily!.sans,
    },
  },
  presets: [presetWind()],
  transformers: [transformerDirectives()],
});
