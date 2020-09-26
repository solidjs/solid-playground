module.exports = {
  theme: {
    extend: {
      colors: {
        twilight: "#282c34",
      },
    },
  },
  purge: {
    mode: "layers",
    layers: ["base", "components", "utilities"],
    content: ["src/**/*.html", "src/**/*.tsx"],
  },
  // purge: false,
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  experimental: "all",
};
