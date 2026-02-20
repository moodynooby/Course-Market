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
bun run lint             # Run ESLint
bun run lint:fix         # Run ESLint with --fix
bun run format           # Format code with Prettier
bun run format:check    # Check formatting without modifying

# Database (Drizzle ORM)
bun run db:generate      # Generate Drizzle schema
bun run db:migrate       # Run database migrations
bun run db:studio        # Open Drizzle Studio

# Testing: No test framework currently configured
```

## Code Style Guidelines

### General Rules

- **Language**: TypeScript with strict mode
- **Format**: Prettier (100 char line width, 2 space indent, single quotes, trailing commas)
- **Linting**: ESLint with react-hooks and react-refresh plugins


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
└── assets/       # Static assets
```

### Database & Netlify Functions

- Schema in `db/schema.ts` using Drizzle ORM
- Netlify functions in `netlify/functions/`
- Access environment variables via `ENV` in `src/config` (Do not use `process.env` or `import.meta.env` directly in components/services)

## Notes for Agents

- Always run `bun run lint:fix` and `bun run format` before committing
- Check `eslint.config.js` for linting rules
- Uses React Compiler (babel-plugin-react-compiler)
- No test framework configured; add Vitest if needed
- DONT BE AFRAID OF CHANGES OR BACKWARDS COMPATIBILTY THIS IS A TOOL NOT USED BY ANYONE ELSE
- ALWAYS UPDATE AGENTS.MD AFTER A ARCHITECTRAL CHANGE