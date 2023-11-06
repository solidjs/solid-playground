import { Component, For } from 'solid-js';

interface File {
  name: string;
}
interface Folder {
  name: string;
  files: File[];
  folders: Folder[];
}

export const FileTree: Component<{ folders: Folder[]; files: File[],onClick: (path:string)=>void }> = (props) => {
  const RenderFolder = (name:string,folder: Folder) => {
    return (
      <>
        <div>{folder.name}</div>
        <For each={folder.folders}>{(inner) => RenderFolder(`${name}/${inner.name}`, inner)}</For>
        <For each={folder.files}>{(file) => <div onClick={() => props.onClick(`${name}/${file.name}`)}>{file.name}</div>}</For>
      </>
    );
  };
  return (
    <div>
      <For each={props.folders}>{(folder) => RenderFolder(folder.name, folder)}</For>
      <For each={props.files}>{(file) => <div onClick={() => props.onClick(file.name)}>{file.name}</div>}</For>
    </div>
  );
};
