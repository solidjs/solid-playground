import './assets/main.css';
import 'virtual:windi.css';

import type { Tab } from 'solid-repl';

import indexTSX from './defaultFiles/index.tsx?raw';

export const defaultTabs: Tab[] = [
  {
    name: 'main.tsx',
    source: indexTSX,
  },
];
