#!/usr/bin/env bash
# Builds the Rust engine to WebAssembly and writes the wasm-bindgen output to lib/engine/wasm/.
# The output is committed (Vercel has no Rust toolchain); CI rebuilds it and fails on any diff.
# Needs: the toolchain pinned in engine/rust-toolchain.toml and wasm-bindgen-cli at the exact
# version of the wasm-bindgen crate in engine/Cargo.lock.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/lib/engine/wasm"
CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"

want="$(grep -A1 '^name = "wasm-bindgen"$' "$ROOT/engine/Cargo.lock" | sed -n 's/^version = "\(.*\)"/\1/p')"
have="$(wasm-bindgen --version | awk '{print $2}')"
if [ "$want" != "$have" ]; then
  echo "wasm-bindgen-cli $have doesn't match the crate ($want): cargo install wasm-bindgen-cli --version $want --locked" >&2
  exit 1
fi

# Strip machine-specific paths so the artifact is byte-identical on any machine.
export RUSTFLAGS="--remap-path-prefix=$CARGO_HOME=/cargo --remap-path-prefix=$ROOT=/lotwise ${RUSTFLAGS:-}"
cargo build --manifest-path "$ROOT/engine/Cargo.toml" --release --locked --target wasm32-unknown-unknown
rm -rf "$OUT"
wasm-bindgen --target web --out-dir "$OUT" --out-name lotwise_engine \
  "$ROOT/engine/target/wasm32-unknown-unknown/release/lotwise_engine.wasm"
rm -f "$OUT/.gitignore"
# The MCP server ships the same binary next to its bundle.
if [ -d "$ROOT/mcp/dist" ]; then cp "$OUT/lotwise_engine_bg.wasm" "$ROOT/mcp/dist/"; fi
ls -l "$OUT"
