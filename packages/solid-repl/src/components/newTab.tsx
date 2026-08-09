import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { Icon } from 'solid-heroicons';
import {
  magnifyingGlass,
  documentPlus,
  document as documentIcon,
  square_2Stack,
  chevronRight,
  arrowUpTray,
  ellipsisHorizontal,
  pencil,
  trash as trashIcon,
} from 'solid-heroicons/outline';
import type { Tab } from 'solid-repl';
import { Input } from './ui/Input';
import { IconButton } from './ui/IconButton';
import { Label } from './ui/Label';
import { useMenu } from './ui/Menu';
import { css, cx } from 'styled-system/css';
import type { IconPath } from './ui/icon';

interface NewTabProps {
  tabs: Tab[];
  onOpenPane: (id: string) => void;
  onOpenFile: (name: string) => void;
  onNewFile: (name: string) => void;
  onUpload: (name: string, source: string) => void;
  onDeleteFile: (name: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onClose: () => void;
}

type Item = {
  type: 'pane' | 'file' | 'action' | 'new';
  id: string;
  label: string;
  icon: IconPath;
  globalIndex: number;
};

type Section = { title: string; items: Item[] };

export const NewTab: Component<NewTabProps> = (props) => {
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [renamingFile, setRenamingFile] = createSignal<string | null>(null);
  let inputRef!: HTMLInputElement;
  let fileInputRef!: HTMLInputElement;

  const categories = createMemo<Section[]>(() => {
    const q = query().toLowerCase();
    const sections: Section[] = [];
    let count = 0;

    const paneItems = ['Preview', 'Output']
      .filter((p) => p.toLowerCase().includes(q))
      .map<Item>((p) => ({ type: 'pane', id: p, label: p, icon: square_2Stack, globalIndex: count++ }));
    if (paneItems.length) sections.push({ title: 'Panes', items: paneItems });

    const files = props.tabs.filter((t) => t.name.toLowerCase().includes(q));
    if (files.length) {
      sections.push({
        title: 'Files',
        items: files.map<Item>((t) => ({
          type: 'file',
          id: t.name,
          label: t.name,
          icon: documentIcon,
          globalIndex: count++,
        })),
      });
    }

    const actions: Omit<Item, 'globalIndex'>[] = [];
    if (q === '' || 'upload file'.includes(q)) {
      actions.push({ type: 'action', id: 'upload', label: 'Upload File', icon: arrowUpTray });
    }
    if (q !== '' && !props.tabs.some((t) => t.name.toLowerCase() === q)) {
      actions.push({ type: 'new', id: q, label: `Create "${query()}"`, icon: documentPlus });
    }
    if (actions.length) {
      sections.push({ title: 'Actions', items: actions.map((item) => ({ ...item, globalIndex: count++ })) });
    }

    return sections;
  });

  const allItems = createMemo(() => categories().flatMap((c) => c.items));

  const handleSelect = (item: Item) => {
    props.onClose();
    if (item.type === 'pane') props.onOpenPane(item.id);
    else if (item.type === 'file') props.onOpenFile(item.id);
    else if (item.type === 'new') props.onNewFile(item.id);
    else if (item.type === 'action' && item.id === 'upload') fileInputRef.click();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (renamingFile()) return;
    const items = allItems();
    if (e.key === 'ArrowDown') setSelectedIndex((i) => (i + 1) % items.length);
    else if (e.key === 'ArrowUp') setSelectedIndex((i) => (i - 1 + items.length) % items.length);
    else if (e.key === 'Enter') {
      const selected = items[selectedIndex()];
      if (selected) handleSelect(selected);
    }
  };

  const handleFileUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      props.onUpload(file.name, e.target?.result as string);
      props.onClose();
    };
    reader.readAsText(file);
  };

  onMount(() => requestAnimationFrame(() => inputRef.focus()));

  return (
    <div class={shell}>
      <input type="file" ref={fileInputRef} class={css({ display: 'none' })} onChange={handleFileUpload} />
      <div class={css({ w: 'full', maxW: '2xl', mx: 'auto' })}>
        <div class={searchBar}>
          <Icon path={magnifyingGlass} class={searchIcon} />
          <Input
            ref={inputRef}
            type="text"
            class={css({ pl: 10 })}
            placeholder="Search panes, files, or type a new filename..."
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <For each={categories()}>
          {(category) => (
            <div class={css({ display: 'flex', flexDirection: 'column', gap: 1 })}>
              <Label class={categoryHeader}>{category.title}</Label>
              <For each={category.items}>
                {(item) => (
                  <ItemRow
                    item={item}
                    isActive={() => item.globalIndex === selectedIndex()}
                    isRenaming={() => renamingFile() === item.id}
                    onSelect={() => handleSelect(item)}
                    onStartRename={() => setRenamingFile(item.id)}
                    onSubmitRename={(newName) => {
                      setRenamingFile(null);
                      props.onRenameFile(item.id, newName);
                    }}
                    onCancelRename={() => setRenamingFile(null)}
                    onDelete={() => {
                      if (confirm(`Delete ${item.label}?`)) props.onDeleteFile(item.id);
                    }}
                  />
                )}
              </For>
            </div>
          )}
        </For>
        <Show when={categories().length === 0}>
          <div class={css({ mt: 8, flexShrink: 0, textAlign: 'center', fontSize: 'sm', color: 'neutral.500' })}>
            <p>No results found for "{query()}"</p>
          </div>
        </Show>
      </div>
    </div>
  );
};

const shell = css({
  display: 'flex',
  flexDirection: 'column',
  h: 'full',
  w: 'full',
  px: 6,
  pb: 30,
  bg: 'white',
  overflowY: 'scroll',
  _dark: { bg: 'neutral.900' },
});

const searchBar = css({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  flexShrink: 0,
  py: 6,
  bg: 'white',
  _dark: { bg: 'neutral.900' },
});

const searchIcon = css({
  position: 'absolute',
  left: 4,
  top: '50%',
  h: 5,
  w: 5,
  color: 'neutral.400',
  pointerEvents: 'none',
  transform: 'translateY(-50%)',
});

const categoryHeader = css({
  position: 'sticky',
  top: '84px',
  zIndex: 10,
  px: 3,
  py: 2,
  borderBottomWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900' },
});

const groupRow = css({
  'position': 'relative',
  '& .menu-trigger': { opacity: 0 },
  '_hover': { '& .menu-trigger': { opacity: 1 } },
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  p: 2,
  rounded: 'lg',
  cursor: 'pointer',
  fontSize: 'sm',
  transition: 'colors',
});

const rowActive = css({
  bg: 'neutral.200',
  _dark: { bg: 'neutral.700' },
  _hover: { bg: 'neutral.200', _dark: { bg: 'neutral.700' } },
});
const rowIdle = css({
  _hover: { bg: 'neutral.100' },
  _dark: { _hover: { bg: 'neutral.800/50' } },
});

const iconCircle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  mr: 3,
  h: 8,
  w: 8,
  rounded: 'full',
});
const iconActive = css({
  bg: 'solidc/10',
  color: 'solidc',
  _dark: { bg: 'neutral.600', color: 'white' },
});
const iconIdle = css({
  bg: 'neutral.100',
  color: 'neutral.500',
  _dark: { bg: 'neutral.800', color: 'neutral.400' },
});

const truncateText = css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
const trailing = css({ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 2, gap: 1 });

const ItemRow: Component<{
  item: Item;
  isActive: () => boolean;
  isRenaming: () => boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onSubmitRename: (name: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
}> = (props) => {
  const isFile = props.item.type === 'file';

  const { api, Content } = useMenu(() => [
    { value: 'open', label: 'Open', onSelect: () => props.onSelect() },
    { value: 'rename', label: 'Rename', icon: pencil, onSelect: () => props.onStartRename() },
    { value: 'delete', label: 'Delete', icon: trashIcon, variant: 'danger', onSelect: () => props.onDelete() },
  ]);

  return (
    <div class={groupRow}>
      <div
        class={cx(rowStyles, props.isActive() ? rowActive : !props.isRenaming() && rowIdle)}
        onClick={() => !props.isRenaming() && props.onSelect()}
      >
        <div class={cx(iconCircle, props.isActive() ? iconActive : iconIdle)}>
          <Icon path={props.item.icon} class={css({ h: 4, w: 4 })} />
        </div>
        <div class={css({ flex: 1, minW: 0, textAlign: 'left' })}>
          <Show when={props.isRenaming()} fallback={<div class={truncateText}>{props.item.label}</div>}>
            <Input
              autofocus
              size="sm"
              value={props.item.label}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  props.onSubmitRename(e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  props.onCancelRename();
                }
              }}
              onBlur={(e) => {
                if (props.isRenaming()) props.onSubmitRename(e.currentTarget.value);
              }}
            />
          </Show>
        </div>
        <div class={trailing}>
          <Show when={isFile && !props.isActive() && !props.isRenaming()}>
            <span onClick={(e) => e.stopPropagation()}>
              <IconButton
                {...api().getTriggerProps()}
                icon={ellipsisHorizontal}
                class={cx('menu-trigger', css({ p: 1 }))}
              />
            </span>
          </Show>
          <Show when={props.isActive() && !props.isRenaming()}>
            <Icon path={chevronRight} class={css({ h: 4, w: 4 })} />
          </Show>
        </div>
      </div>
      <Content />
    </div>
  );
};
