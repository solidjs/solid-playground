import * as monaco from 'monaco-editor';
import vsDark from './themes/vs_dark_good.json';
import vsLight from './themes/vs_light_good.json';

monaco.editor.defineTheme('vs-dark-plus', vsDark as monaco.editor.IStandaloneThemeData);
monaco.editor.defineTheme('vs-light-plus', vsLight as monaco.editor.IStandaloneThemeData);
