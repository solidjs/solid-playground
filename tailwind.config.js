const colors = require("tailwindcss/colors");
const isProd = process.env["npm_lifecycle_event"] === "build";

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
        mono: ["Fira Code"],
      },
    },
  },
  dark: false,
  purge: {
    enabled: isProd,
    mode: "layers",
    layers: ["base", "components", "utilities"],
    content: ["src/**/*.html", "src/**/*.tsx"],
  },
  plugins: [require("@tailwindcss/forms")],
};
