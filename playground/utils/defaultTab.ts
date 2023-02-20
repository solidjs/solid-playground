export const getDefaultOutput = () => {
  if (typeof window.localStorage) {
    const defaultOutput = localStorage.getItem('defaultOutput');
    if (defaultOutput == '1') return 1;
  }
  return 0;
};
export const setDefaultOutput = (output: number) => {
  if (typeof window.localStorage) {
    localStorage.setItem('defaultOutput', output.toString());
  }
};
export const getStoreOutputTab = () => {
  if (typeof window.localStorage) {
    const defaultOutput = localStorage.getItem('storeDefaultOutput');
    if (defaultOutput == 'true') return true;
  }
  return false;
};
export const setStoreOutputTabLocal = (x: boolean) => {
  if (typeof window.localStorage) {
    localStorage.setItem('storeDefaultOutput', x.toString());
  }
};
