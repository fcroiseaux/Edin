# AGENTS.md

## Build/Lint/Test Commands

- **Build**: `turbo run build`
- **Lint**: `turbo run lint`
  - Includes ESLint checks across all packages
- **Full Tests**: `turbo run test`
- **Single Test**: `turbo run test --filter=PACKAGE --testPathPattern=filename.test.ts`
  - Example: `turbo run test --filter=web --testPathPattern=auth` runs all auth tests
- **Test Coverage**: `turbo run test --coverage`
- **Format**: `pnpm run format`
- **Format Check**: `pnpm run format:check` (fails if formatting issues exist)

## Code Style Guidelines

### General

- Follow Prettier formatting rules (2 spaces, single quotes, trailing commas)
- TypeScript strict mode enabled (no `any` allowed)
- No console.log in production code
- Commit messages must follow conventional commits format

### TypeScript

- Use interfaces for public APIs
- Avoid `unknown` when possible
- Explicit type definitions for components
- Use `never` for unreachable code paths

### Imports

- Group imports by type:
  1. Built-in libraries
  2. Third-party libraries
  3. Internal modules
- Sort alphabetically within groups
- Avoid circular dependencies (enforced by linting)

### Naming Conventions

- `camelCase` for variables/functions
- `PascalCase` for components/classes
- `kebab-case` for files/paths
- Prefix constants with `CONST_`

### Error Handling

- Use custom error classes extending `Error`
- Log errors with context (user ID, request ID)
- Never expose sensitive information in logs
- Use `try/catch` only in boundary layers

## Tooling Rules

- **Git Hooks**: Husky pre-commit runs:
  - Prettier checks
  - ESLint verification
- **Commit Validation**: `commitlint` configured for conventional commits
- **PR Requirements**: All tests must pass before merging

## Special Notes

- This monorepo uses `turbo` for parallel execution
- Tests run in isolated environments per package
- Always check if tests are in the correct package folder (e.g., `apps/web/src/tests`)
- No `console.log` in production code
- For component-specific tests: `turbo run test --filter=web --testPathPattern=component`
