import { createSignal } from 'solid-js';
import { isDarkTheme } from './utils/isDarkTheme';

export const [dark, setDark] = createSignal(isDarkTheme());
