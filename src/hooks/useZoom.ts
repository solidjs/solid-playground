import { createStore, SetStoreFunction } from 'solid-js/store';

type ZoomState = {
  zoom: number;
  scaleIframe: boolean;
  overrideNative: boolean;
  fontSize: number;
  scale: number;
};

const getLS = () => {
  const result = localStorage.getItem('zoomState');
  if (result == null) return null;
  return JSON.parse(result) as ZoomState;
};

const ls = getLS();
const initFontSize = 15;
const initScale = 100;

const [zoomState, setZoomStateInternal] = createStore<ZoomState>({
  overrideNative: ls?.overrideNative || true,
  scaleIframe: ls?.scaleIframe || true,
  zoom: ls?.zoom || 100,
  get fontSize() {
    return initFontSize * (this.zoom / 100);
  },
  get scale() {
    return initScale * (100 / this.zoom);
  },
});

const setZoomState: SetStoreFunction<ZoomState> = (...args: any[]) => {
  (setZoomStateInternal as any)(...args);
  localStorage.setItem(
    'zoomState',
    JSON.stringify({
      zoom: zoomState.zoom,
      scaleIframe: zoomState.scaleIframe,
      overrideNative: zoomState.overrideNative,
    }),
  );
};

export const useZoom = () => {
  const updateZoom = (input: 'increase' | 'decrease' | 'reset') => {
    let { zoom } = zoomState;

    switch (input) {
      case 'increase':
        zoom += 10;
        break;
      case 'decrease':
        zoom -= 10;
        break;
      default:
        zoom = 100;
        break;
    }

    setZoomState('zoom', Math.min(Math.max(zoom, 40), 200));
  };

  return { zoomState, updateZoom, setZoomState };
};
