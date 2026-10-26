module.exports = {
  plugins: {
    '@pandacss/dev/postcss': {
      cwd: __dirname,
      configPath: `${__dirname}/panda.config.ts`,
    },
  },
};
