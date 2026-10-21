import { createRoot, runWithOwner, type Owner } from 'solid-js';
import { insert, type JSX } from '@solidjs/web';
import { SplitviewPanel } from 'dockview';

// Dockview creates parts from imperative callbacks (its constructor, `fromJSON`, user actions),
// which in Solid 2 are either unowned or inside `onSettled` where creating roots is forbidden.
// Mount each part as a root under the owner that created the layout: it inherits context and is
// disposed with it if dockview has not disposed it first. The view is evaluated in the root body
// (not passed to `insert` as a function) so part bodies never run inside a render computation.
function mountSolid(owner: Owner | null, element: HTMLElement, view: () => JSX.Element): () => void {
  return runWithOwner(owner, () =>
    createRoot((dispose) => {
      insert(element, view());
      return dispose;
    }),
  );
}

export interface SolidPart<P> {
  element: HTMLElement;
  init(params: P): void;
  dispose(): void;
}

export function solidPart<P>(
  owner: Owner | null,
  className: string,
  view: (params: P) => JSX.Element,
  onInit?: (params: P) => (() => void) | void,
): SolidPart<P> {
  const element = document.createElement('div');
  element.className = className;

  let disposeRoot: (() => void) | undefined;
  let disposeInit: (() => void) | void;

  return {
    element,
    init(params) {
      disposeInit = onInit?.(params);
      disposeRoot = mountSolid(owner, element, () => view(params));
    },
    dispose() {
      disposeInit?.();
      disposeRoot?.();
      disposeInit = undefined;
      disposeRoot = undefined;
    },
  };
}

export class SolidSplitviewPanel extends SplitviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly owner: Owner | null,
    private readonly view: () => JSX.Element,
  ) {
    super(id, component);
  }
  getComponent() {
    return { update: () => {}, dispose: mountSolid(this.owner, this.element, this.view) };
  }
}
