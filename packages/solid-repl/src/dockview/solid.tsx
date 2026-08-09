import { SplitviewPanel, type Parameters as PanelParameters } from 'dockview-core';
import { createRoot, type JSX } from 'solid-js';
import { insert } from 'solid-js/web';

export type SolidPanelComponent = (params: PanelParameters | undefined) => JSX.Element;

export class SolidPanelView extends SplitviewPanel {
  constructor(
    id: string,
    component: string,
    private readonly myComponent: SolidPanelComponent,
  ) {
    super(id, component);
  }
  getComponent() {
    const dispose = createRoot((dispose) => {
      insert(this.element, () => this.myComponent(this.params));
      return dispose;
    });
    return {
      update: () => {},
      dispose,
    };
  }
}
