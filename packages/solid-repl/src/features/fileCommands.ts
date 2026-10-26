import { pencil, trash } from '../components/ui/icons';
import type { MenuItemDef } from '../components/ui/Menu';
import type { Workspace } from '../kernel/workspace';

export function fileMenuItems(workspace: Workspace, fileId: string, startRename?: () => void): MenuItemDef[] {
  const editableFile = () => (workspace.isProtected(fileId) ? undefined : workspace.byId(fileId));

  if (!editableFile()) return [];

  return [
    {
      value: 'file.rename',
      label: 'Rename',
      icon: pencil,
      onSelect: () => {
        const file = editableFile();
        if (!file) return;
        if (startRename) return startRename();
        const next = prompt('Rename file to:', file.name);
        if (next) workspace.rename(file.id, next);
      },
    },
    {
      value: 'file.delete',
      label: 'Delete',
      icon: trash,
      variant: 'danger',
      onSelect: () => {
        const file = editableFile();
        if (!file) return;
        if (confirm(`Delete ${file.name}?`)) workspace.remove(file.id);
      },
    },
  ];
}
