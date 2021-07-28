import { batch } from 'solid-js';
import { createStore } from 'solid-js/store';

type TZoomState = {
  zoom: number;
  scaleIframe: boolean;
  native: boolean;
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
  native: ls ? ls.native : false,
  fontSize: ls ? ls.fontSize : initFontSize,
  scale: ls ? ls.scale : initScale,
  zoom: ls ? ls.zoom : 100,
  scaleIframe: ls ? ls.scaleIframe : true,
});
console.log(JSON.parse(JSON.stringify(zoomState)));

const useZoom = () => {
  const updateZoom = (input: 'increase' | 'decrease' | 'reset') => {
    let { zoom, fontSize, scale, native, scaleIframe } = zoomState;
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

    localStorage.setItem(
      'zoomState',
      JSON.stringify({ zoom, fontSize, scale, native, scaleIframe }),
    );

    setZoomState({ ...zoomState, fontSize, zoom, scale });
  };

  return { zoomState, updateZoom };
};
export default useZoom;
