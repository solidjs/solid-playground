export const isDarkTheme = () => {
  if (typeof window !== 'undefined') {
    if (window.localStorage) {
      const isDarkTheme = window.localStorage.getItem('dark');
      if (typeof isDarkTheme === 'string') {
        return isDarkTheme === 'true';
      }
    }

    const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (userMedia.matches) {
      return true;
    }
  }

  // Default theme is light.
  return false;
};
