# Course Market Migration Guide

This document outlines the changes made during the migration to the latest versions and best practices.

## 🎯 Migration Summary

### Upgraded Dependencies

| Package | Previous Version | New Version | Major Changes |
|---------|-----------------|-------------|---------------|
| React Router DOM | 6.26.0 | 7.3.0 | New routing API with `createBrowserRouter` |
| MUI | 5.16.0 | 7.2.1 | Updated theme structure, improved TypeScript types |
| Drizzle ORM | 0.45.1 | 0.41.0 | Updated config syntax |
| Drizzle Kit | 0.31.9 | 0.31.6 | Config file updates |
| React Compiler Plugin | 1.0.0 | 19.0.0-beta | Latest React 19 compiler |

### New Dependencies Added

- **prettier** (^3.5.3) - Code formatting
- **eslint-config-prettier** (^10.1.1) - ESLint/Prettier integration
- **eslint-plugin-jsx-a11y** (^6.10.2) - Accessibility linting
- **husky** (^9.1.7) - Git hooks
- **lint-staged** (^15.4.3) - Pre-commit linting

## 📋 Breaking Changes & Updates

### 1. React Router v6 → v7

**Previous (v6):**
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

**New (v7):**
```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
    ],
  },
]);

<RouterProvider router={router} />
```

**Key Changes:**
- Routes are now defined as a data structure passed to `createBrowserRouter`
- Removed `<BrowserRouter>`, `<Routes>`, and `<Route>` JSX components
- Better type inference and performance
- Automatic code splitting with lazy routes

### 2. MUI v5 → v7

**Theme Structure Changes:**
- Updated `createTheme` from `@mui/material/styles`
- Better TypeScript inference for theme customization
- Improved color system with CSS variables support

**Component Updates:**
- All components now have better built-in accessibility
- Improved performance with reduced re-renders
- Better dark mode support

### 3. TypeScript Strict Mode

**New Compiler Options:**
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true
}
```

**Impact:**
- All code must be type-safe
- Array access returns `T | undefined`
- Optional properties are strictly optional
- Better catch of runtime errors at compile time

## 🗂️ Project Structure Improvements

### Path Aliases

New import paths for cleaner imports:

```typescript
// Old
import { Component } from '../components/Component';

// New
import { Component } from '@components/Component';

// Or
import { Component } from '@/components/Component';
```

**Available Aliases:**
- `@/` → `./src/`
- `@components/` → `./src/components/`
- `@pages/` → `./src/pages/`
- `@context/` → `./src/context/`
- `@hooks/` → `./src/hooks/`
- `@utils/` → `./src/utils/`
- `@types/` → `./src/types/`
- `@services/` → `./src/services/`
- `@constants/` → `./src/constants/`
- `@assets/` → `./src/assets/`

### Barrel Exports

Each folder now has an `index.ts` for cleaner imports:

```typescript
// Instead of
import { useAuth, useThemeMode } from '@context/AuthContext';
import { useCourses } from '@hooks/useCourses';

// Use
import { useAuth, useThemeMode } from '@context';
import { useCourses } from '@hooks';
```

## 🛠️ Code Quality Improvements

### ESLint Enhancements

**New Rules:**
- Accessibility rules from `eslint-plugin-jsx-a11y`
- React best practices enforcement
- MUI-specific best practices
- Type-checked rules with TypeScript

**Run linting:**
```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
```

### Prettier Setup

**Configuration:**
- 2 spaces indentation
- Single quotes
- Trailing commas
- 100 characters line width
- LF line endings

**Run formatting:**
```bash
npm run format            # Format all files
npm run format:check      # Check formatting
```

### Pre-commit Hooks

**Husky + lint-staged:**
- Automatically runs ESLint and Prettier on staged files
- Prevents poorly formatted commits
- Ensures code quality before pushing

## 🎨 React 19 Best Practices

### Error Boundary

Added `ErrorBoundary` component for better error handling:

```tsx
import { ErrorBoundary } from '@components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### React Compiler

Enabled React Compiler plugin for automatic optimizations:
- No need for `useMemo` and `useCallback` in most cases
- Automatic memoization of components and values
- Better performance out of the box

## 📦 Installation & Setup

### Fresh Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Setup Git Hooks

```bash
npm run prepare
```

This will install Husky and set up the pre-commit hooks.

## 🔄 Database Changes

### Drizzle ORM Update

**Config File Changes:**
```typescript
// Old
export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL!
  },
  schema: './db/schema.ts',
  out: './migrations'
});

// New
export default {
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

**Database Commands:**
```bash
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio
```

## ⚠️ Migration Notes

### Breaking Changes for Developers

1. **Router Navigation:**
   - Replace `<Navigate>` with `Navigate({ to: '/', replace: true })`
   - Use `useNavigate()` hook instead of `useHistory()`

2. **Type Safety:**
   - Array access now returns `T | undefined`
   - Must handle undefined cases explicitly

3. **MUI Components:**
   - Some deprecated props removed
   - Better type inference requires proper typing

### Common Migration Issues

**Issue 1: Array access errors**
```typescript
// Error: Object is possibly 'undefined'
const item = array[0];

// Fix
const item = array[0] ?? defaultValue;
// or
const item = array[0]!; // if you're sure it exists
```

**Issue 2: Optional properties**
```typescript
// Error: Type is not assignable
const obj: { name?: string } = { name: 'test' };

// Fix
const obj: { name: string | undefined } = { name: 'test' };
// or
const obj: { name?: string } = { name: 'test' } as const;
```

## 📚 Additional Resources

- [React Router v7 Documentation](https://reactrouter.com/dev)
- [MUI v7 Documentation](https://mui.com/material-ui/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

When contributing to this project:

1. Run `npm run lint:fix` before committing
2. Run `npm run format` to ensure consistent formatting
3. Add new exports to barrel `index.ts` files
4. Use path aliases for imports
5. Follow TypeScript strict mode guidelines
6. Test your changes thoroughly

## 📝 Next Steps

1. **Test thoroughly:** Run the application and test all features
2. **Update documentation:** Keep this guide updated with any new changes
3. **Monitor for issues:** Keep an eye on the console for deprecation warnings
4. **Stay updated:** Check for updates to dependencies regularly
