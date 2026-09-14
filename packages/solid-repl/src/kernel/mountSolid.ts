import { createRoot, type JSX } from 'solid-js';
import { insert } from 'solid-js/web';
import { SplitviewPanel } from 'dockview';

// `insert(element, view())`, not `insert(element, view)`: the latter runs the body inside a
// render effect and zag machines never start.
function mountSolid(element: HTMLElement, view: () => JSX.Element): () => void {
  return createRoot((dispose) => {
    insert(element, view());
    return dispose;
  });
}

export interface SolidPart<P> {
  element: HTMLElement;
  init(params: P): void;
  dispose(): void;
}

export function solidPart<P>(
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
      disposeRoot = mountSolid(element, () => view(params));
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
    private readonly view: () => JSX.Element,
  ) {
    super(id, component);
  }
  getComponent() {
    return { update: () => {}, dispose: mountSolid(this.element, this.view) };
  }
}
