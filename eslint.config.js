import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'convex/_generated/**',
      'assets/vendor/**',
      'assets/css/tailwind.css'
    ]
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'sw.js', 'scripts/**/*.mjs', 'tests/**/*.js', 'tailwind.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        Chart: 'readonly',
        CSS: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': 'warn'
    }
  }
];
