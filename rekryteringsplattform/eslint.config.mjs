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
  // no-explicit-any is disabled. The ~270 instances live almost entirely in
  // Supabase query handling (joins return loose row shapes) and Anthropic SDK
  // response parsing. Properly typing them requires generated Supabase types,
  // which is a separate project. The rule is off rather than warn to keep
  // CI output clean. Re-enable after running `supabase gen types typescript`.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
