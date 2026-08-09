import type { KeyBinding } from '@codemirror/view';
import type { CommandItem } from '../components/ui/CommandPalette';
import type { IconPath } from '../components/ui/icon';

export interface Command {
  id: string;
  title: string;
  icon?: IconPath;
  group?: string;
  variant?: 'default' | 'danger';
  key?: string;
  shortcut?: string;
  menus: CommandMenu[];
  when?: () => boolean;
  run: () => void;
}

export type CommandMenu = 'editor/context' | 'editor/toolbar';

export const menuOf = (commands: Command[], menu: CommandMenu): Command[] =>
  commands.filter((c) => c.menus.includes(menu) && (!c.when || c.when()));

export const keyBindingsOf = (commands: Command[]): KeyBinding[] =>
  commands
    .filter((c) => c.key)
    .map((c) => ({
      key: c.key,
      preventDefault: true,
      run: () => {
        if (c.when && !c.when()) return false;
        c.run();
        return true;
      },
    }));

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const MODIFIERS: Record<string, string> = isMac
  ? { Mod: '⌘', Cmd: '⌘', Shift: '⇧', Alt: '⌥', Ctrl: '⌃' }
  : { Mod: 'Ctrl', Cmd: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Ctrl: 'Ctrl' };

export function formatKey(key: string): string {
  const parts = key.split('-');
  const base = parts.pop()!;
  const mods = parts.map((p) => MODIFIERS[p] ?? p);
  const tail = base.length === 1 ? base.toUpperCase() : base;
  return isMac ? [...mods, tail].join('') : [...mods, tail].join('+');
}

export const toCommandItems = (commands: Command[]): CommandItem[] =>
  commands.map((c) => ({
    id: c.id,
    label: c.title,
    icon: c.icon,
    shortcut: c.shortcut ? formatKey(c.shortcut) : c.key ? formatKey(c.key) : undefined,
    group: c.group,
    onSelect: c.run,
  }));
