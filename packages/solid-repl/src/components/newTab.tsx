import { Component, createSignal, For, createMemo, onMount, Show } from 'solid-js';
import { Icon } from 'solid-heroicons';
import {
  magnifyingGlass,
  documentPlus,
  document as documentIcon,
  square_2Stack,
  chevronRight,
  arrowUpTray,
  ellipsisHorizontal,
} from 'solid-heroicons/outline';
import type { Tab } from 'solid-repl';
import { Input } from './ui/Input';
import { IconButton } from './ui/IconButton';
import { Label } from './ui/Label';
import { Menu, MenuItem } from './ui/Menu';
import { pencil, trash as trashIcon } from 'solid-heroicons/outline';
import Dismiss from 'solid-dismiss';

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

export const NewTab: Component<NewTabProps> = (props) => {
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [renamingFile, setRenamingFile] = createSignal<string | null>(null);
  let inputRef!: HTMLInputElement;
  let fileInputRef!: HTMLInputElement;

  const categories = createMemo(() => {
    const q = query().toLowerCase();
    const sections: { title: string; items: any[] }[] = [];
    let count = 0;

    // Panes - Always show Preview and Output
    const paneItems = ['Preview', 'Output']
      .filter((p) => p.toLowerCase().includes(q))
      .map((p) => ({
        type: 'pane',
        id: p,
        label: p,
        icon: square_2Stack,
        globalIndex: count++,
      }));
    if (paneItems.length) {
      sections.push({ title: 'Panes', items: paneItems });
    }

    // Files
    const files = props.tabs.filter((t) => t.name.toLowerCase().includes(q));
    if (files.length > 0) {
      sections.push({
        title: 'Files',
        items: files.map((t) => ({
          type: 'file',
          id: t.name,
          label: t.name,
          icon: documentIcon,
          globalIndex: count++,
        })),
      });
    }

    // Actions
    const actions = [];
    if (q === '' || 'upload file'.includes(q)) {
      actions.push({
        type: 'action',
        id: 'upload',
        label: 'Upload File',
        icon: arrowUpTray,
      });
    }
    if (q !== '' && !props.tabs.some((t) => t.name.toLowerCase() === q)) {
      actions.push({
        type: 'new',
        id: q,
        label: `Create "${query()}"`,
        icon: documentPlus,
      });
    }

    if (actions.length > 0) {
      sections.push({
        title: 'Actions',
        items: actions.map((item) => ({ ...item, globalIndex: count++ })),
      });
    }

    return sections;
  });

  const allItems = createMemo(() => categories().flatMap((c) => c.items));

  const handleKeyDown = (e: KeyboardEvent) => {
    if (renamingFile()) return;

    const items = allItems();
    if (e.key === 'ArrowDown') {
      setSelectedIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      const selected = items[selectedIndex()];
      if (selected) {
        handleSelect(selected);
      }
    }
  };

  const handleSelect = (item: any) => {
    props.onClose();
    if (item.type === 'pane') {
      props.onOpenPane(item.id);
    } else if (item.type === 'file') {
      props.onOpenFile(item.id);
    } else if (item.type === 'new') {
      props.onNewFile(item.id);
    } else if (item.type === 'action') {
      if (item.id === 'upload') {
        fileInputRef.click();
      }
    }
  };

  const handleFileUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        props.onUpload(file.name, content);
        props.onClose();
      };
      reader.readAsText(file);
    }
  };

  const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

  onMount(() => requestAnimationFrame(() => inputRef.focus()));

  return (
    <div class="h-full w-full bg-white px-6 dark:bg-neutral-900 pb-30 flex flex-col overflow-y-scroll">
      <input type="file" ref={fileInputRef} class="hidden" onChange={handleFileUpload} />
      <div class="w-full mx-auto max-w-2xl">
        <div class="top-0 z-20 bg-white py-6 dark:bg-neutral-900 sticky shrink-0">
          <Icon
            path={magnifyingGlass}
            class="left-4 h-5 w-5 text-neutral-400 pointer-events-none absolute top-1/2 -translate-y-1/2"
          />
          <Input
            ref={inputRef}
            type="text"
            class="w-full pl-10"
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
            <div class="space-y-1 flex flex-col">
              <Label class="z-10 bg-white px-3 py-2 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 sticky top-[84px] border-b">
                {category.title}
              </Label>
              <For each={category.items}>
                {(item) => {
                  let btnRef: HTMLButtonElement | undefined;
                  const isActive = () => item.globalIndex === selectedIndex();
                  const isRenaming = () => renamingFile() === item.id;
                  return (
                    <div class="group relative">
                      <div
                        class="w-full p-2 flex items-center rounded-lg cursor-pointer text-sm transition-colors"
                        classList={{
                          'bg-neutral-200 dark:bg-neutral-700': isActive(),
                          'hover:bg-neutral-100 dark:hover:bg-neutral-800/50': !isActive() && !isRenaming(),
                          'hover:bg-neutral-200 dark:hover:bg-neutral-700': isActive(),
                        }}
                        onClick={() => !isRenaming() && handleSelect(item)}
                      >
                        <div
                          class="mr-3 h-8 w-8 flex shrink-0 items-center justify-center rounded-full"
                          classList={{
                            'bg-solidc/10 text-solidc dark:bg-neutral-600 dark:text-white': isActive(),
                            'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400': !isActive(),
                          }}
                        >
                          <Icon path={item.icon} class="h-4 w-4" />
                        </div>
                        <div class="min-w-0 flex-1 text-left">
                          <Show when={isRenaming()} fallback={<div class="truncate">{item.label}</div>}>
                            <Input
                              autofocus
                              size="sm"
                              value={item.label}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation();
                                  setRenamingFile(null);
                                  props.onRenameFile(item.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setRenamingFile(null);
                                }
                              }}
                              onBlur={(e) => {
                                if (isRenaming()) {
                                  setRenamingFile(null);
                                  props.onRenameFile(item.id, e.currentTarget.value);
                                }
                              }}
                            />
                          </Show>
                        </div>
                        <div class="ml-2 space-x-1 flex shrink-0 items-center">
                          <Show when={item.type === 'file' && !isActive() && !isRenaming()}>
                            <IconButton
                              ref={btnRef}
                              icon={ellipsisHorizontal}
                              class="p-1 opacity-0 group-hover:opacity-100"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(activeMenu() === item.id ? null : item.id);
                              }}
                            />
                          </Show>
                          <Show when={isActive() && !isRenaming()}>
                            <Icon path={chevronRight} class="h-4 w-4" />
                          </Show>
                        </div>
                      </div>
                      <Show when={item.type === 'file'}>
                        <Dismiss
                          open={() => activeMenu() === item.id}
                          setOpen={(val) => {
                            if (!val) setActiveMenu(null);
                          }}
                          menuButton={() => btnRef}
                        >
                          <Menu class="right-0 mt-1 absolute top-full" onClose={() => setActiveMenu(null)}>
                            <MenuItem
                              label="Open"
                              onClick={() => {
                                handleSelect(item);
                                setActiveMenu(null);
                              }}
                            />
                            <MenuItem
                              label="Rename"
                              icon={pencil}
                              onClick={() => {
                                setRenamingFile(item.id);
                                setActiveMenu(null);
                              }}
                            />
                            <MenuItem
                              label="Delete"
                              icon={trashIcon}
                              variant="danger"
                              onClick={() => {
                                if (confirm(`Delete ${item.label}?`)) {
                                  props.onDeleteFile(item.id);
                                }
                                setActiveMenu(null);
                              }}
                            />
                          </Menu>
                        </Dismiss>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          )}
        </For>
        <Show when={categories().length === 0}>
          <div class="mt-8 text-neutral-500 shrink-0 text-center text-sm">
            <p>No results found for "{query()}"</p>
          </div>
        </Show>
      </div>
    </div>
  );
};
