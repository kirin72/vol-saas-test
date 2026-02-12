import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // JSX에서 self-closing 태그 강제 (br, img, input 등)
      'react/self-closing-comp': ['error', {
        component: true,
        html: true,
      }],
      // void 요소는 반드시 self-closing으로 작성
      'react/void-dom-elements-no-children': 'error',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
