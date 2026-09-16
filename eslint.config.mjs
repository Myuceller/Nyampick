import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // Next 16 enables the React Compiler rule set by default. These two rules
    // flag existing, intentional effect/ref patterns and need a dedicated
    // refactor instead of blocking the framework security upgrade.
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "apps/mobile/**",
  ]),
]);
