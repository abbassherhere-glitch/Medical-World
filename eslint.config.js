import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'design-reference/'] },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
];
