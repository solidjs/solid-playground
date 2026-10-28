---
'solid-repl': patch
---

Fix the compiler worker crashing on every compile with `Calling require for "assert"`: Babel's module-import helper requires Node's `assert`, which is now aliased to a small browser shim.
