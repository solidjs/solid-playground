export const isDarkTheme = () => {
  const stored = localStorage.getItem('dark');
  return stored != null ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
};
