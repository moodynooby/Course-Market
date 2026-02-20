# AGENTS.md - Agent Coding Guidelines

## Project Overview

- **Type**: React + TypeScript web application (Vite)
- **UI Framework**: MUI (Material-UI) with Emotion
- **Database**: Drizzle ORM (SQLite on Netlify)
- **Purpose**: Course marketplace for trading course sections

## Build Commands

```bash
# Development & Build
bun run dev              # Start Vite dev server (port 3000)
bun run build            # TypeScript compile + Vite build
bun run preview          # Preview production build

# Linting & Formatting
bun run lint             # Run Biome lint
bun run lint:fix         # Run Biome lint with --write
bun run format           # Format code with Biome
bun run format:check     # Check formatting without modifying

# Database (Drizzle ORM)
bun run db:generate      # Generate Drizzle schema
bun run db:migrate       # Run database migrations
bun run db:studio        # Open Drizzle Studio

# Testing (Vitest + Testing Library)
bun run test             # Run tests in watch mode
bun run test:run         # Run tests once (CI)
bun run test:ui          # Run tests with UI
bun run test:coverage    # Run tests with coverage report
```

## Code Style Guidelines

### General Rules

- **Language**: TypeScript with strict mode
- **Format**: Biome (100 char line width, 2 space indent, single quotes, trailing commas)
- **Linting**: Biome with React hooks rules

### Naming Conventions

- **Components**: PascalCase (e.g., `CourseList`)
- **Functions/variables**: camelCase (e.g., `loadCSV`)
- **Props interfaces**: `{ComponentName}Props` (e.g., `CourseListProps`)
- **Types**: Use `type` for unions/primitives, `interface` for objects
- **Files**: kebab-case (e.g., `use-courses.ts`)

### React Patterns

- Custom hooks: prefix with `use` (e.g., `export function useCourses()`)
- Event handlers: prefix with `handle` (e.g., `handleSelectSection`)
- Early returns for cleaner conditionals
- Use inline functions for simple handlers, `useCallback` for expensive ones passed to children

### State Management

- Use React Context for global state (auth, theme)
- Use local useState for component-specific state
- Use custom hooks to encapsulate stateful logic

### CSS & Styling

- MUI components preferred; Emotion `sx` prop for inline styles
- Use theme colors instead of hardcoded values
- Keep custom CSS minimal; use MUI system

### Testing Philosophy

- **Simple yet effective**: Write minimal tests that provide maximum confidence
- Focus on critical paths and user-facing functionality
- Avoid over-testing implementation details
- Test behavior, not implementation
- Keep tests readable and maintainable

### What to Test

- **Core utility functions**: `csv.ts`, `schedule.ts`, `id.ts`
- **Component rendering**: Verify components render correctly with props
- **User interactions**: Clicks, form submissions, navigation
- **Async operations**: Loading states, error handling, success states
- **Form validation**: Valid inputs, invalid inputs, edge cases
- **Error boundaries**: Verify fallback UI renders on errors

### What NOT to Test

- Implementation details (private methods, internal state)
- Third-party library behavior
- DOM structure that doesn't affect user experience
- Trivial getters/setters
- Components that are purely presentational with no logic

### Test Types

- **Unit tests**: Fast, isolated tests for individual functions/components
- **Integration tests**: Tests that verify multiple components work together
- **Performance tests**: Verify critical paths complete in reasonable time

### Running Tests

```bash
# Run tests in watch mode (development)
bun run test

# Run tests once (CI/CD)
bun run test:run

# Run tests with coverage
bun run test:coverage

# Run tests with UI
bun run test:ui
```

### CI/CD Pipeline

The `ci` script runs all quality checks:

```bash
bun run ci  # Runs lint, format:check, and test:run
```

This should be run in your CI/CD pipeline before merging changes.

### File Organization

```
src/
├── components/   # Reusable UI components
├── pages/        # Route-level components
├── context/      # React Context providers
├── hooks/        # Custom React hooks
├── services/     # API and external service integrations
├── utils/        # Pure utility functions
├── types/        # TypeScript type definitions
├── config/       # Centralized application configurations and accessors
├── test/         # Test utilities and helpers
└── assets/       # Static assets

```

### Database & Netlify Functions

- Schema in `db/schema.ts` using Drizzle ORM
- Netlify functions in `netlify/functions/`
- Access environment variables via `ENV` in `src/config` (Do not use `process.env` or `import.meta.env` directly in components/services)

## Notes for Agents

- Always run `bun run lint:fix` and `bun run format` before committing
- Check `biome.json` for linting rules
- Uses React Compiler (babel-plugin-react-compiler)
- Test framework: Vitest + Testing Library - keep tests simple yet effective
- DONT BE AFRAID OF CHANGES OR BACKWARDS COMPATIBILTY THIS IS A TOOL NOT USED BY ANYONE ELSE
- ALWAYS UPDATE AGENTS.MD AFTER A ARCHITECTRAL CHANGE
