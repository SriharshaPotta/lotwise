// Bundles the server (and the shared engine wrapper and trade-file code from ../lib) into one
// dependency-free file, dist/lotwise-mcp.mjs, next to a copy of the engine's .wasm.
import { build } from "esbuild";
import { copyFileSync, chmodSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/lotwise-mcp.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  legalComments: "none",
  minify: true,
  banner: { js: "#!/usr/bin/env node\nimport { createRequire as __lotwiseRequire } from 'node:module'; const require = __lotwiseRequire(import.meta.url);" },
  logLevel: "warning",
});
chmodSync("dist/lotwise-mcp.mjs", 0o755);
copyFileSync("../lib/engine/wasm/lotwise_engine_bg.wasm", "dist/lotwise_engine_bg.wasm");
console.log("built dist/lotwise-mcp.mjs");
