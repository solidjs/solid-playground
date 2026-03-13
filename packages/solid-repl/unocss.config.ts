import { theme } from '@unocss/preset-wind3';
import { defineConfig } from 'unocss';
import sharedConfig from '../../uno.config.ts';

export default defineConfig({
  ...(sharedConfig as any),
  theme: {
    ...(sharedConfig as any).theme,
    fontFamily: {
      sans: 'Gordita, ' + theme.fontFamily!.sans,
    },
  },
});
