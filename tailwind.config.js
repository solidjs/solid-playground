module.exports = {
  theme: {
    extend: {
      colors: {
        twilight: "#282c34",
      },
    },
  },
  purge: ["src/**/*.html", "src/**/*.tsx"],
  future: {
    removeDeprecatedGapUtilities: true,
  },
  experimental: "all",
};
