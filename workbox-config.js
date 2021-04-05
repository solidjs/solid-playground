module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff,woff2}'],
  swDest: 'dist/sw.js',
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 5_000_000,
};
