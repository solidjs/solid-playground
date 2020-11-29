const colors = require("tailwindcss/colors");

module.exports = {
  theme: {
    extend: {
      colors: {
        ...colors,
        twilight: "#282c34",
      },
    },
  },
  dark: false,
  purge: {
    mode: "layers",
    layers: ["base", "components", "utilities"],
    content: ["src/**/*.html", "src/**/*.tsx"],
  },
  // purge: false,
};
