import type { rollup } from "rollup";
import type { transform } from "@babel/standalone";

declare var $rollup: typeof rollup;
declare var $babel: (code: string) => ReturnType<typeof transform>;
