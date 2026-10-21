import { createStore } from 'solid-js';

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

const [state, setState] = createStore({
  overrideNative: ls?.overrideNative ?? true,
  scaleIframe: ls?.scaleIframe ?? true,
  zoom: ls?.zoom ?? 100,
});

const zoomState: ZoomState = {
  get overrideNative() {
    return state.overrideNative;
  },
  get scaleIframe() {
    return state.scaleIframe;
  },
  get zoom() {
    return state.zoom;
  },
  get fontSize() {
    return initFontSize * (state.zoom / 100);
  },
  get scale() {
    return initScale * (100 / state.zoom);
  },
};

type Persisted = Pick<ZoomState, 'zoom' | 'scaleIframe' | 'overrideNative'>;

// Store writes land on the next flush, so persist from the value being written.
const persist = (patch: Partial<Persisted>) => {
  const { zoom, scaleIframe, overrideNative } = state;
  localStorage.setItem('zoomState', JSON.stringify({ zoom, scaleIframe, overrideNative, ...patch }));
};

const setZoom = (value: number) => {
  const zoom = Math.min(Math.max(value, ZOOM_MIN), ZOOM_MAX);
  setState((s) => {
    s.zoom = zoom;
  });
  persist({ zoom });
};

const updateZoom = (input: 'increase' | 'decrease' | 'reset') =>
  setZoom(input === 'increase' ? zoomState.zoom + ZOOM_STEP : input === 'decrease' ? zoomState.zoom - ZOOM_STEP : 100);

const setOverrideNative = (value: boolean) => {
  setState((s) => {
    s.overrideNative = value;
  });
  persist({ overrideNative: value });
};

const setScaleIframe = (value: boolean) => {
  setState((s) => {
    s.scaleIframe = value;
  });
  persist({ scaleIframe: value });
};

export const useZoom = () => ({ zoomState, updateZoom, setOverrideNative, setScaleIframe });
