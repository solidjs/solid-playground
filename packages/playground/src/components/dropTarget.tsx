import { Component, createSignal, JSX, Show } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { arrowDownTray } from 'solid-heroicons/outline';

interface DropTargetProps {
  handleImport: (files: { name: string; source: string }[]) => void;
  children: JSX.Element;
  class?: string;
}

const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.html'];

export const DropTarget: Component<DropTargetProps> = (props) => {
  const [isDragging, setIsDragging] = createSignal(false);

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
      );

      if (files.length === 0) {
        setIsDragging(false);
        return;
      }
      
      const results = await Promise.allSettled(
        files.map((file) => {
          return new Promise<{ name: string; source: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                name: file.name,
                source: (e.target?.result as string) || '',
              });
            };
            reader.readAsText(file);
          });
        }),
      );
      props.handleImport(
        results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      );
      setIsDragging(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragEnd={() => setIsDragging(false)}
      onDrop={onDrop}
      classList={{
        [props.class || '']: true,
        'relative': true,
      }}
    >
      {props.children}
      <Show when={isDragging()}>
        <div
          class="absolute inset-0 z-50 border-2 border-dashed border-gray-300 dark:border-gray-700 pointer-events-none content-[''] bg-black/50"
        >
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <Icon path={arrowDownTray} class="h-10 w-10 text-gray-200 mb-2" />
            <p class="text-gray-200">Drag and drop files here to import</p>
          </div>
        </div>
      </Show>
    </div>
  );
}
