import type { Tab } from "../store";
import { loadBabel, loadRollup } from "./dependencies";

// TODO: Make this file a web worker

const SOLID_VERSION = "0.22";
const CDN_URL = "https://cdn.skypack.dev";
const tabsLookup: Map<string, Tab> = new Map();

/**
 * This function helps identify each section of the final compiled
 * output from the rollup concatenation.
 *
 * @param tab {Tab} - A tab
 */
function generateCodeString(tab: Tab) {
  return `// source: ${tab.name}.${tab.type}\n${tab.source}`;
}

/**
 * This is a custom rollup plugin to handle tabs as a
 * virtual file system and replacing every imports with a
 * ESM CDN import.
 *
 * Note: Passing in the Solid Version for letter use
 */
function virtual({ SOLID_VERSION }) {
  return {
    name: "repl-plugin",

    async resolveId(importee: string) {
      // This is a tab being imported
      if (importee.startsWith(".")) return importee;

      // This is an external module
      return {
        id: `${CDN_URL}/${importee.replace(
          "solid-js",
          `solid-js@${SOLID_VERSION}`
        )}`,
        external: true,
      };
    },

    async load(id: string) {
      const tab = tabsLookup.get(id);
      return tab ? generateCodeString(tab) : null;
    },

    async transform(code: string, id: string) {
      // Compile solid code
      const babel = await loadBabel(SOLID_VERSION);

      if (/\.jsx$/.test(id)) return babel(code);
    },
  };
}

export async function compile(tabs: Tab[]) {
  try {
    const rollup = await loadRollup();

    for (const tab of tabs) {
      tabsLookup.set(`./${tab.name}.${tab.type}`, tab);
    }

    const compiler = await rollup({
      input: `./${tabs[0].name}.${tabs[0].type}`,
      plugins: [virtual({ SOLID_VERSION })],
    });

    const {
      output: [{ code }],
    } = await compiler.generate({ format: "esm" });

    return [null, code as string] as const;
  } catch (e) {
    return [e.message, null] as const;
  }
}

// async function compile(input: string, mode: string) {
//   try {
//     const { transform } = await import("@babel/standalone");
//     const solid = await import("babel-preset-solid");

//     const options =
//       mode === "SSR"
//         ? { generate: "ssr", hydratable: true }
//         : mode === "HYDRATION"
//         ? { generate: "dom", hydratable: true }
//         : { generate: "dom", hydratable: false };

//     const { code } = transform(input, { presets: [[solid, options]] });

//     return [null, code] as const;
//   } catch (e) {
//     console.error(e);
//     return [e.message, null] as const;
//   }
// }
