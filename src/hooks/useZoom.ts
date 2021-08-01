import { createStore } from 'solid-js/store';

type TZoomState = {
  zoom: number;
  scaleIframe: boolean;
  overrideNative: boolean;
  fontSize: number;
  scale: number;
};

const getLS = () => {
  const result = localStorage.getItem('zoomState');
  if (result == null) return null;
  return JSON.parse(result) as TZoomState;
};

const ls = getLS();
const initFontSize = 15;
const initScale = 100;

const [zoomState, setZoomState] = createStore<TZoomState>({
  overrideNative: ls ? ls.overrideNative : true,
  fontSize: ls ? ls.fontSize : initFontSize,
  scale: ls ? ls.scale : initScale,
  zoom: ls ? ls.zoom : 100,
  scaleIframe: ls ? ls.scaleIframe : true,
});

const useZoom = () => {
  const updateZoomScale = (input: 'increase' | 'decrease' | 'reset') => {
    let { zoom, fontSize, scale } = zoomState;
    const max = 200;
    const min = 40;

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

    if (zoom > max) zoom = max;
    if (zoom < min) zoom = min;
    fontSize = (initFontSize * zoom) / 100;
    scale = (initScale / zoom) * 100;

    localStorage.setItem('zoomState', JSON.stringify({ ...zoomState, zoom, fontSize, scale }));

    setZoomState({ ...zoomState, fontSize, zoom, scale });
  };

  const updateZoomSettings = (
    input: keyof Pick<TZoomState, 'overrideNative' | 'scaleIframe'>,
    value: boolean,
  ) => {
    let { overrideNative, scaleIframe } = zoomState;

    switch (input) {
      case 'overrideNative':
        overrideNative = value;
        break;
      case 'scaleIframe':
        scaleIframe = value;
        break;
    }

    localStorage.setItem(
      'zoomState',
      JSON.stringify({ ...zoomState, overrideNative, scaleIframe }),
    );

    setZoomState({ ...zoomState, overrideNative, scaleIframe });
  };

  return { zoomState, updateZoomScale, updateZoomSettings };
};
export default useZoom;
