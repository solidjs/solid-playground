import { createStore } from 'solid-js/store';

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
const initFontSize = 14;
const initScale = 100;
const ZOOM_MIN = 40;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

const [zoomState, setState] = createStore<ZoomState>({
  overrideNative: ls?.overrideNative ?? true,
  scaleIframe: ls?.scaleIframe ?? true,
  zoom: ls?.zoom ?? 100,
  get fontSize() {
    return initFontSize * (this.zoom / 100);
  },
  get scale() {
    return initScale * (100 / this.zoom);
  },
});

const persist = () => {
  const { zoom, scaleIframe, overrideNative } = zoomState;
  localStorage.setItem('zoomState', JSON.stringify({ zoom, scaleIframe, overrideNative }));
};

const setZoom = (zoom: number) => {
  setState('zoom', Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX));
  persist();
};

const updateZoom = (input: 'increase' | 'decrease' | 'reset') =>
  setZoom(input === 'increase' ? zoomState.zoom + ZOOM_STEP : input === 'decrease' ? zoomState.zoom - ZOOM_STEP : 100);

const setOverrideNative = (value: boolean) => {
  setState('overrideNative', value);
  persist();
};

const setScaleIframe = (value: boolean) => {
  setState('scaleIframe', value);
  persist();
};

export const useZoom = () => ({ zoomState, updateZoom, setOverrideNative, setScaleIframe });
