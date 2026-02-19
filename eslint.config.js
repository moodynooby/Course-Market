import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  { ignores: ['dist', 'node_modules', '.netlify', 'coverage'] },

  // Base JS + TS recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React Hooks recommended (flat config style)
  {
    ...reactHooks.configs['recommended-latest'],
    files: ['src/**/*.{ts,tsx}'],
  },

  // Configuration for config files (Node.js)
  {
    files: ['*.config.ts', 'drizzle.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  },

  // Database schema files
  {
    files: ['db/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Netlify functions (Node.js)
  {
    files: ['netlify/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        process: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // React app source files
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        React: 'readonly',
        RequestInit: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',       
      'react-hooks/exhaustive-deps': 'warn',        

      // React Refresh
      'react-refresh/only-export-components': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'prefer-const': 'warn',                     

      // TypeScript
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
);
