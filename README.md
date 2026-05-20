# AuraIsHub

**Course scheduler + section trading platform. Built because registration is a mess.**

Pick your courses, generate every conflict-free timetable, have AI rank them by your preferences (runs in-browser, nothing leaves your machine), and trade sections with other students.

Website [aurais.netlify.app](https://aurais.netlify.app/)

Github [GitHub](https://github.com/moodynooby/Course-Market)

## Features

### Course Browser, Preferences & AI Optimization
- Search and filter by subject; pick sections visually with a card layout
- Set time windows, gaps, morning vs afternoon, credit range, and day preferences
- Block specific instructors
- AI runs via WebLLM — fully in-browser, fully private — scores and ranks schedules against your preferences, with a regular algorithm as fallback

### Schedule View
- Calendar grid + list view
- Live conflict warnings and scoring
- Flip between multiple generated options

### Trading Board
- Post section swap requests, browse others'
- Online (Netlify + PostgreSQL) or local-only mode
- Open → pending → completed status tracking

### Rate My Professor
- Leave ratings and reviews for instructors
- See ratings while browsing sections so you know what you're signing up for

## Architecture

### Frontend
```
src/
├── components/
├── hooks/
│   ├── useCourses.ts
│   ├── usePreferences.ts
│   ├── useSelections.ts
│   └── useTrading.ts
├── services/
│   ├── llm.ts
│   └── tradesApi.ts
├── types/
├── utils/
│   └── schedule.ts
└── constants/
```

### Backend (Netlify Functions)
```
netlify/functions/
└── trades.ts
```

## Dev

```bash
pnpm run dev          # Vite + Netlify dev server
pnpm run build        # Production build
pnpm run preview      # Preview it
pnpm run test         # Tests
pnpm run fix          # Lint + format
pnpm run typecheck    # TS check
pnpm run ci           # The whole pipeline
```

### Database
```bash
pnpm run db:generate  # Generate migration
pnpm run db:migrate   # Apply it
pnpm run db:studio    # Drizzle Studio GUI
```

## Seeding

### Step 1 — CSVs to JSON
```bash
python scripts/csv_to_semester_json.py \
  --semester-id Monsoon2026 \
  --semester-name "Monsoon Semester 2026"
  # --force-refresh to overwrite
```

### Step 2 — Seed
```bash
npx tsx scripts/seed-semester.ts Monsoon2026
```
