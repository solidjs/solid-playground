import { defineConfig } from '@pandacss/dev';
import baseConfig from '../../panda.config';

export default defineConfig({
  ...baseConfig,
  include: ['./src/**/*.{ts,tsx}'],
});
