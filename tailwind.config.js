const colors = require("tailwindcss/colors");

module.exports = {
  theme: {
    extend: {
      colors: {
        ...colors,
        twilight: "#282c34",
        // This color has accessibility issues
        primary: "#4483c1",
      },
      fontFamily: {
        // This font doesn't render properly, it has a lien-height issue it seems
        // sans: ["Gordita"],
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
  plugins: [require("@tailwindcss/forms")],
};
