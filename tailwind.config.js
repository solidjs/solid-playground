module.exports = {
  theme: {
    extend: {
      colors: {
        twilight: "#282c34",
      },
    },
  },
  purge: ["src/**/*.html", "src/**/*.tsx"],
  // purge: false,
  future: {
    removeDeprecatedGapUtilities: true,
  },
  experimental: "all",
};
