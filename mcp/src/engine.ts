// The same Rust/WASM engine the website runs, loaded synchronously from the .wasm file.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initEngineSync, type WasmEngine } from "../../lib/engine/wasm";

let engine: WasmEngine | null = null;

export function getEngine(): WasmEngine {
  if (engine) return engine;
  const candidates = [
    // next to the bundle (mcp/dist/lotwise-mcp.mjs)
    new URL("./lotwise_engine_bg.wasm", import.meta.url),
    // running from source (mcp/src/engine.ts)
    new URL("../../lib/engine/wasm/lotwise_engine_bg.wasm", import.meta.url),
  ].map((u) => fileURLToPath(u));
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error(`lotwise_engine_bg.wasm not found (looked in ${candidates.join(", ")})`);
  engine = initEngineSync(readFileSync(path));
  return engine;
}
