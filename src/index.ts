import './assets/main.css';
import 'virtual:windi.css';

export { processImport } from './utils/processImport';
export { createTabList } from './utils/createTabList';
import type { Tab } from '../types/types';
export type { Tab };

import indexTSX from './defaultFiles/index.tsx?raw';

export const defaultTabs: Tab[] = [
  {
    name: 'main.tsx',
    source: indexTSX,
  },
];
