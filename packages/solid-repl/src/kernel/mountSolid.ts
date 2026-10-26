import { createRoot, runWithOwner, type Owner } from 'solid-js';
import { insert, type JSX } from '@solidjs/web';
import { SplitviewPanel } from 'dockview';

// `insert(element, view())`, not `insert(element, view)`: the latter runs part bodies inside a
// render computation.
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
