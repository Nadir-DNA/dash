const js = require('@eslint/js');
const nextPlugin = require('eslint-config-next');

module.exports = [
  js.configs.recommended,
  ...nextPlugin,
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      // Common rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-var': 'error',
      
      // Node.js specific
      'node/no-unsupported-features/es-syntax': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'build/',
      'coverage/',
      'dashboard/',
      'skills/',
    ],
  },
];