import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The mock backend is a localStorage store, so every screen loads its data
    // on the client after mount — there is no server component that could
    // fetch instead. `set-state-in-effect` flags that whole pattern. Once
    // lib/api.ts is pointed at Supabase and the reads move to server
    // components, this override should be deleted, not kept.
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
