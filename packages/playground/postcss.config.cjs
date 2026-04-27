const path = require('node:path');

module.exports = {
  plugins: {
    '@pandacss/dev/postcss': {
      cwd: path.resolve(__dirname, '..', '..'),
      configPath: path.resolve(__dirname, '..', '..', 'panda.config.ts'),
    },
  },
};
