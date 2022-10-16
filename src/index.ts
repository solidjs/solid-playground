import 'virtual:uno.css';
import './assets/main.css';
import '@unocss/reset/tailwind.css';

import type { Tab } from 'solid-repl';

import indexTSX from './defaultFiles/index.tsx?raw';

export const defaultTabs: Tab[] = [
  {
    name: 'main.tsx',
    source: indexTSX,
  },
];
