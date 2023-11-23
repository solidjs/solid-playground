import { GridviewPanel, GroupPanelFrameworkComponentFactory, SplitviewPanel } from 'dockview-core';
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

export const frameworkComponentFactory: GroupPanelFrameworkComponentFactory = {
  content: {
    createComponent: (_id, _componentId, component) => {
      const element = (<div class="flex h-full flex-col"></div>) as HTMLDivElement;
      let disposer;
      return {
        element,
        init: (params) => {
          createRoot((dispose) => {
            insert(element, () => component(params.params));
            disposer = dispose;
          });
        },
        dispose: () => disposer!(),
      };
    },
  },
  tab: {
    createComponent: (id, componentId, component) => {
      const element = (<div class="flex h-full"></div>) as HTMLDivElement;
      let disposer;
      return {
        element,
        init: (params) => {
          if (params.api.isVisible) {
            createRoot((dispose) => {
              insert(element, () => component(params.params));
              disposer = dispose;
            });
          }
        },
        dispose: () => disposer!(),
      };
    },
  },
  watermark: {
    createComponent: (_id, _componentId, _component) => {
      return {
        element: document.createElement('div'),
        init: () => {},
        updateParentGroup: () => {},
      };
    },
  },
};
