import { GridviewPanel, SplitviewPanel } from 'dockview-core';
import { createRoot } from 'solid-js';
import { insert } from 'solid-js/web';

export class SolidPanelView extends SplitviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly myComponent: any,
  ) {
    super(id, component);
  }
  getComponent() {
    const dispose = createRoot((dispose) => {
      insert(this.element, () => this.myComponent(this.params));
      return dispose;
    });
    return {
      update: (params: any) => {},
      dispose,
    };
  }
}

export class SolidGridPanelView extends GridviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly myComponent: any,
  ) {
    super(id, component);
  }
  getComponent() {
    const dispose = createRoot((dispose) => {
      insert(this.element, () => this.myComponent.call(this, this.params));
      return dispose;
    });
    return {
      update: (params: any) => {},
      dispose,
    };
  }
}
