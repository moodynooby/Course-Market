# 🎓 AuraIsHub

**Your AI-powered course scheduler & section trading platform.**

Plan your perfect timetable in minutes. Browse courses, generate every conflict-free schedule, optimize with AI (runs in your browser — free & private), swap sections with other students, and rate professors. Built by students, for students — for this semester and every semester after.

> 🌐 [aurais.netlify.app](https://aurais.netlify.app/) · 🐙 [GitHub](https://github.com/moodynooby/Course-Market)
>
## ✨ Features

### 📚 Course Browser

- Subject-based filtering and search functionality
- Detailed section information with scheduling conflicts detection
- Visual selection of preferred course sections
- Responsive card-based layout

### ⚙️ Advanced Preferences

- Personalized scheduling preferences (time windows, gaps between classes)
- Instructor exclusion lists
- Day preferences and consecutive day optimization
- Credit range settings
- Morning/afternoon time preferences

### 🧠 AI-Powered Schedule Optimization

- Browser-based AI (WebLLM) integration
- Deterministic fallback scheduling algorithm
- Comprehensive schedule scoring based on user preferences
- AI-powered analysis and recommendations
- Alternative schedule suggestions

### 📅 Interactive Schedule View

- Visual calendar grid with time-based layout
- Comprehensive schedule list with section details
- Conflict detection and warning system
- Real-time score calculation
- Multiple schedule alternatives

### 🔄 Multi-User Trading Board

- Real-time course/section trading platform
- Both online (Netlify + Neon/PostgreSQL) and local storage modes
- User profile creation and management
- Trade posting with offers/requests
- Status management (open, pending, completed)
- Sample data generation for testing

## 🏗️ Architecture

### Frontend Structure

```
src/
├── components/           # React components
├── hooks/               # React custom hooks
│   ├── useCourses.ts    # Course data management
│   ├── usePreferences.ts # User preferences
│   ├── useSelections.ts # Section selection
│   └── useTrading.ts    # Trading functionality
├── services/            # Business logic
│   ├── llm.ts          # LLM integration
│   └── tradesApi.ts    # Trading API
├── types/              # TypeScript definitions
├── utils/              # Utility functions
│   └── schedule.ts     # Schedule optimization
└── constants/          # Application constants
```

### Backend (Netlify Functions)

```
netlify/functions/
└── trades.ts          # Trading board API
```

## 🔧 Development

### Available Scripts

```bash
pnpm run dev          # Start development server (Vite + Netlify plugin)
pnpm run build        # Build for production
pnpm run preview      # Preview production build
pnpm run test         # Run tests
pnpm run fix          # Auto-fix linting/formatting
pnpm run typecheck    # Check TypeScript types
pnpm run ci           # Full CI check (lint + typecheck + test)
```

### Database Commands

```bash
pnpm run db:generate  # Generate migration from schema changes
pnpm run db:migrate   # Apply migrations
pnpm run db:studio    # Open Drizzle Studio (DB GUI)
```

## Seeding

## Step 1: Convert CSVs to JSON

python scripts/csv_to_semester_json.py   --semester-id Monsoon2026 --semester-name "Monsoon Semester 2026"

## --force-refresh for

## Step 2: Seed the database

npx tsx scripts/seed-semester.ts Monsoon2026
