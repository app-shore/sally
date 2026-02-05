# Coding Guidelines Automation Setup

**Version:** 1.0.0
**Last Updated:** February 5, 2026
**Purpose:** Configure automated enforcement of SALLY coding guidelines

---

## Table of Contents

1. [Overview](#overview)
2. [ESLint Configuration](#eslint-configuration)
3. [Prettier Configuration](#prettier-configuration)
4. [Husky Pre-Commit Hooks](#husky-pre-commit-hooks)
5. [VS Code Settings](#vs-code-settings)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Installation Steps](#installation-steps)

---

## Overview

This document provides the complete configuration for automated enforcement of the [SALLY Coding Guidelines](./coding-guidelines.md).

**Automation stack:**
- **ESLint** - Lint rules (file naming, imports, TypeScript)
- **Prettier** - Code formatting
- **Husky** - Git hooks (pre-commit auto-fix)
- **lint-staged** - Run linters on staged files only
- **CI/CD** - Block merges on violations

---

## ESLint Configuration

### Required Packages

```bash
# Frontend (apps/web/)
npm install -D \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-import \
  eslint-plugin-check-file \
  eslint-config-next

# Backend (apps/backend/)
npm install -D \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-import \
  eslint-plugin-check-file
```

### Frontend ESLint Config

```json
// apps/web/.eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "import",
    "check-file"
  ],
  "rules": {
    // File naming - enforce kebab-case
    "check-file/filename-naming-convention": [
      "error",
      {
        "**/*.{ts,tsx}": "KEBAB_CASE"
      },
      {
        "ignoreMiddleExtensions": true
      }
    ],
    "check-file/folder-naming-convention": [
      "error",
      {
        "**/*": "KEBAB_CASE"
      }
    ],

    // Import order
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "type"
        ],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal",
            "position": "before"
          }
        ],
        "pathGroupsExcludedImportTypes": ["builtin"],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],

    // No relative imports
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../*", "./*"],
            "message": "Use absolute imports with @/ instead of relative imports"
          }
        ]
      }
    ],

    // TypeScript
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "fixStyle": "separate-type-imports"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-floating-promises": "error",

    // React
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // Import resolution
    "import/no-unresolved": "error",
    "import/no-duplicates": "error"
  },
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "out/",
    "public/",
    "*.config.js",
    "*.config.ts"
  ]
}
```

### Backend ESLint Config

```json
// apps/backend/.eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "import",
    "check-file"
  ],
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    // File naming - enforce kebab-case
    "check-file/filename-naming-convention": [
      "error",
      {
        "**/*.{ts,js}": "KEBAB_CASE"
      },
      {
        "ignoreMiddleExtensions": true
      }
    ],
    "check-file/folder-naming-convention": [
      "error",
      {
        "**/*": "KEBAB_CASE"
      }
    ],

    // Import order
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "type"
        ],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal",
            "position": "before"
          }
        ],
        "pathGroupsExcludedImportTypes": ["builtin"],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],

    // No relative imports
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../*", "./*"],
            "message": "Use absolute imports with @/ instead of relative imports"
          }
        ]
      }
    ],

    // TypeScript
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "fixStyle": "separate-type-imports"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-floating-promises": "error",

    // Import resolution
    "import/no-unresolved": "error",
    "import/no-duplicates": "error"
  },
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  },
  "ignorePatterns": [
    "node_modules/",
    "dist/",
    "*.config.js"
  ]
}
```

---

## Prettier Configuration

### Required Packages

```bash
# Root (for monorepo)
npm install -D prettier
```

### Prettier Config

```json
// .prettierrc (root)
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

### Prettier Ignore

```
// .prettierignore (root)
node_modules
.next
.turbo
dist
build
coverage
*.config.js
*.config.ts
pnpm-lock.yaml
package-lock.json
```

---

## Husky Pre-Commit Hooks

### Required Packages

```bash
# Root
npm install -D husky lint-staged
```

### Husky Setup

```bash
# Initialize Husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

### Lint-Staged Config

```json
// package.json (root)
{
  "lint-staged": {
    "apps/web/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "apps/backend/**/*.{ts,js}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Pre-Commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit checks..."
npx lint-staged
```

---

## VS Code Settings

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  // Auto-fix on save
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": false
  },

  // Format on save
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // ESLint
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.workingDirectories": [
    "./apps/web",
    "./apps/backend"
  ],

  // TypeScript
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,

  // Tailwind CSS
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],

  // File associations
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint (Frontend)
        run: cd apps/web && npm run lint

      - name: Run ESLint (Backend)
        run: cd apps/backend && npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: TypeScript check (Frontend)
        run: cd apps/web && npm run type-check

      - name: TypeScript check (Backend)
        run: cd apps/backend && npm run type-check

      - name: Run tests (Frontend)
        run: cd apps/web && npm run test

      - name: Run tests (Backend)
        run: cd apps/backend && npm run test

      - name: Build (Frontend)
        run: cd apps/web && npm run build

      - name: Build (Backend)
        run: cd apps/backend && npm run build
```

### Package.json Scripts

Add these scripts to each app's `package.json`:

```json
// apps/web/package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "build": "next build"
  }
}
```

```json
// apps/backend/package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.js",
    "lint:fix": "eslint . --ext .ts,.js --fix",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "build": "nest build"
  }
}
```

---

## Installation Steps

### 1. Install All Packages

```bash
# Root (monorepo)
npm install -D husky lint-staged prettier

# Frontend
cd apps/web
npm install -D \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-import \
  eslint-plugin-check-file \
  eslint-config-next \
  eslint-import-resolver-typescript

# Backend
cd apps/backend
npm install -D \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-import \
  eslint-plugin-check-file \
  eslint-import-resolver-typescript
```

### 2. Create Configuration Files

Create all the configuration files shown above:
- `.eslintrc.json` (frontend and backend)
- `.prettierrc` (root)
- `.prettierignore` (root)
- `package.json` with lint-staged config (root)
- `.vscode/settings.json`
- `.vscode/extensions.json`
- `.github/workflows/ci.yml`

### 3. Initialize Husky

```bash
# Root
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
chmod +x .husky/pre-commit
```

### 4. Test the Setup

```bash
# Run linters manually
cd apps/web && npm run lint
cd apps/backend && npm run lint

# Run Prettier check
npm run format:check

# Test pre-commit hook (stage some files)
git add .
git commit -m "Test pre-commit hook"
```

### 5. Fix Existing Code

```bash
# Auto-fix all existing code
cd apps/web && npm run lint:fix && npm run format
cd apps/backend && npm run lint:fix && npm run format
```

---

## Troubleshooting

### ESLint Not Finding TypeScript Files

**Problem:** ESLint can't resolve TypeScript paths (@/ imports)

**Solution:**
1. Install `eslint-import-resolver-typescript`
2. Ensure `tsconfig.json` has correct path mappings
3. Add to ESLint config:
```json
{
  "settings": {
    "import/resolver": {
      "typescript": {
        "project": "./tsconfig.json"
      }
    }
  }
}
```

### Husky Hooks Not Running

**Problem:** Pre-commit hook doesn't execute

**Solution:**
```bash
# Reinitialize Husky
rm -rf .husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
chmod +x .husky/pre-commit
```

### File Naming Errors on Existing Files

**Problem:** Many existing files fail kebab-case check

**Solution:**
1. Run a script to rename all files to kebab-case
2. Update all imports
3. OR: Add exceptions to ESLint config temporarily

```json
{
  "rules": {
    "check-file/filename-naming-convention": [
      "error",
      {
        "**/*.{ts,tsx}": "KEBAB_CASE"
      },
      {
        "ignoreMiddleExtensions": true,
        // Temporarily ignore specific patterns
        "ignore": [
          "**/page.tsx",
          "**/layout.tsx",
          "**/loading.tsx",
          "**/error.tsx"
        ]
      }
    ]
  }
}
```

### Prettier Conflicts with ESLint

**Problem:** Prettier and ESLint formatting rules conflict

**Solution:**
Install `eslint-config-prettier` to disable conflicting ESLint rules:

```bash
npm install -D eslint-config-prettier
```

Update `.eslintrc.json`:
```json
{
  "extends": [
    // ... other extends
    "prettier" // Must be last
  ]
}
```

---

## Gradual Adoption Strategy

If you want to adopt these rules gradually without breaking existing code:

### Phase 1: Warnings Only (Week 1)
Change all `"error"` to `"warn"` in ESLint config. Fix critical issues only.

### Phase 2: New Files Only (Week 2)
Configure ESLint to ignore existing files:
```json
{
  "ignorePatterns": [
    "src/lib/**/*",
    "src/components/**/*"
  ]
}
```

### Phase 3: Migrate Feature by Feature (Weeks 3-6)
Remove directories from `ignorePatterns` one at a time, fixing violations.

### Phase 4: Full Enforcement (Week 7+)
All rules set to `"error"`, no ignores, CI blocks merges.

---

## Maintenance

### Updating ESLint Rules

When updating rules:
1. Discuss with team
2. Update `.eslintrc.json`
3. Run `npm run lint:fix` to auto-fix existing code
4. Update this document
5. Communicate changes to team

### Adding New Plugins

When adding ESLint plugins:
1. Install package: `npm install -D eslint-plugin-xxx`
2. Add to `plugins` array in `.eslintrc.json`
3. Add rules to `rules` object
4. Test on sample code
5. Document in this file

---

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [TypeScript ESLint](https://typescript-eslint.io/)

---

**Last Updated:** February 5, 2026
**Version:** 1.0.0
