// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint 10 flat config.
 *
 * Type-aware linting is on (`projectService`), which is the reason this project
 * pins TypeScript to 6.x: TypeScript 7 ships without a public compiler API until
 * 7.1, and typescript-eslint's peer range excludes it (">=4.8.4 <6.1.0").
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // verbatimModuleSyntax is on in tsconfig; make the linter enforce the
      // same thing so type-only imports never become runtime imports.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Interpolating a number is safe and idiomatic; the rule's value is in
      // catching objects and nullables, which stay disallowed.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  // Plain JS config files are not part of any tsconfig project.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // ---------------------------------------------------------------------------
  // Client
  // ---------------------------------------------------------------------------
  {
    files: ['packages/web/**/*.{ts,tsx}'],
    // `configs.flat[...]` is the flat-config build; `configs[...]` is still the
    // legacy eslintrc shape and throws under ESLint 10.
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // ---------------------------------------------------------------------------
  // Server — console output is how a server reports, and it runs on node.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Layer dependency rule — see docs/ARCHITECTURE.md
  //
  //     app  →  pages  →  features  →  shared
  //
  // A module may only import from layers strictly below it. Documenting this
  // is not enough; unenforced conventions decay. These rules fail CI instead.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/web/src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/pages/**', '@/features/**'],
              message:
                'shared/ is the bottom layer and must stay domain-agnostic — it may not import from app/, pages/ or features/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/web/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**', '@/pages/**'],
              message:
                'features/ may only import from shared/ — importing a page or the app root inverts the dependency rule.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/web/src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/**'],
              message:
                'pages/ may not import from app/ — the app layer composes pages, not vice versa.',
            },
            {
              group: ['@/features/*/**'],
              message:
                'Import a feature through its barrel (@/features/<name>), not its internals, so the feature stays refactorable.',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Tests may reach for the pragmatic option.
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.test.{ts,tsx}', '**/tests/**/*.{ts,tsx}', '**/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Must stay last: switches off every rule Prettier owns.
  prettier,
);
