import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The React Compiler-era rules flag deliberate patterns here (reading localStorage after
      // hydration, imperative typewriter refs). Reported, not blocking.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  { files: ["**/*.test.ts", "e2e/**"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "lib/engine/wasm/**", "mcp/dist/**", "mcp/node_modules/**", "engine/target/**", "test-results/**", "playwright-report/**"]),
]);
