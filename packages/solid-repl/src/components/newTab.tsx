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

  onMount(() => {
    inputRef.focus();
  });

  const categories = createMemo(() => {
    const q = query().toLowerCase();
    const sections: { title: string; items: any[] }[] = [];
    let count = 0;

    // Actions
    const actions = [];
    if (q === '' || 'upload file'.includes(q)) {
      actions.push({ type: 'action', id: 'upload', label: 'Upload File', icon: arrowUpTray });
    }
    if (q !== '' && !props.tabs.some((t) => t.name.toLowerCase() === q)) {
      actions.push({ type: 'new', id: q, label: `Create "${query()}"`, icon: documentPlus });
    }

    if (actions.length > 0) {
      sections.push({
        title: 'Actions',
        items: actions.map((item) => ({ ...item, globalIndex: count++ })),
      });
    }

    // Panes - Always show Preview and Output
    const paneItems = ['Preview', 'Output']
      .filter((p) => p.toLowerCase().includes(q))
      .map((p) => ({ type: 'pane', id: p, label: p, icon: square_2Stack, globalIndex: count++ }));
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

  return (
    <div class="flex h-full w-full flex-col bg-white p-6 pb-0 dark:bg-neutral-900" onClick={() => setActiveMenu(null)}>
      <input type="file" ref={fileInputRef} class="hidden" onChange={handleFileUpload} />
      <div
        class="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col text-black dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="relative mb-6 shrink-0">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Icon path={magnifyingGlass} class="h-5 w-5 text-neutral-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            class="focus:border-brand-default dark:focus:border-brand-default block w-full border-b border-neutral-200 bg-transparent py-3 pr-4 pl-10 text-lg focus:outline-none dark:border-neutral-700"
            placeholder="Search panes, files, or type a new filename..."
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div class="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto pr-2">
          <For each={categories()}>
            {(category) => (
              <div class="flex flex-col space-y-1">
                <div class="px-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">{category.title}</div>
                <For each={category.items}>
                  {(item) => (
                    <div class="group relative">
                      <Show
                        when={renamingFile() === item.id}
                        fallback={
                          <button
                            class="flex w-full shrink-0 items-center rounded-lg p-2 text-left transition-colors"
                            classList={{
                              'bg-neutral-100 dark:bg-neutral-800': item.globalIndex === selectedIndex(),
                              'hover:bg-neutral-50 dark:hover:bg-neutral-800/50': item.globalIndex !== selectedIndex(),
                            }}
                            onClick={() => handleSelect(item)}
                          >
                            <div
                              class="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                              classList={{
                                'bg-brand-default/10 text-brand-default': item.globalIndex === selectedIndex(),
                                'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400':
                                  item.globalIndex !== selectedIndex(),
                              }}
                            >
                              <Icon path={item.icon} class="h-4 w-4" />
                            </div>
                            <div class="min-w-0 flex-1 text-black dark:text-white">
                              <div class="truncate text-sm font-medium">{item.label}</div>
                              <Show when={item.type !== 'file'}>
                                <div class="text-[10px] text-neutral-500 capitalize dark:text-neutral-400">
                                  {item.type}
                                </div>
                              </Show>
                            </div>
                            <div class="flex shrink-0 items-center space-x-1">
                              <Show when={item.type === 'file'}>
                                <button
                                  class="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenu(activeMenu() === item.id ? null : item.id);
                                  }}
                                >
                                  <Icon path={ellipsisHorizontal} class="h-4 w-4 text-neutral-400" />
                                </button>
                              </Show>
                              <Show when={item.globalIndex === selectedIndex()}>
                                <Icon path={chevronRight} class="text-brand-default h-4 w-4" />
                              </Show>
                            </div>
                          </button>
                        }
                      >
                        <div class="flex items-center p-2">
                          <input
                            autofocus
                            class="border-brand-default flex-1 border-b bg-transparent text-sm font-medium focus:outline-none"
                            value={item.label}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                if (renamingFile() === item.id) {
                                  setRenamingFile(null);
                                  props.onRenameFile(item.id, e.currentTarget.value);
                                }
                              } else if (e.key === 'Escape') {
                                setRenamingFile(null);
                              }
                            }}
                            onBlur={(e) => {
                              if (renamingFile() === item.id) {
                                setRenamingFile(null);
                                props.onRenameFile(item.id, e.currentTarget.value);
                              }
                            }}
                          />
                        </div>
                      </Show>

                      <Show when={activeMenu() === item.id}>
                        <div class="absolute top-full right-0 z-20 mt-1 flex w-32 flex-col rounded-lg border border-neutral-100 bg-white py-1 text-xs shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                          <button
                            class="px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700"
                            onClick={() => {
                              handleSelect(item);
                              setActiveMenu(null);
                            }}
                          >
                            Open
                          </button>
                          <button
                            class="px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700"
                            onClick={() => {
                              setRenamingFile(item.id);
                              setActiveMenu(null);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            class="px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => {
                              if (confirm(`Delete ${item.label}?`)) {
                                props.onDeleteFile(item.id);
                              }
                              setActiveMenu(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>

        <Show when={categories().length === 0}>
          <div class="mt-8 shrink-0 text-center text-sm text-neutral-500">
            <p>No results found for "{query()}"</p>
          </div>
        </Show>
      </div>
    </div>
  );
};
