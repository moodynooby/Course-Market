# AuraIsHub

**Course scheduler + section trading platform. Built because registration is a mess.**

Pick your courses, generate conflict-free timetables based on your preferences, and trade sections with other students.

Website [aurais.netlify.app](https://aurais.netlify.app/)

Github [GitHub](https://github.com/moodynooby/Course-Market)

## Features

### Course Browser & Preferences
- Search and filter by subject; pick sections visually with a card layout
- Set time windows, gaps, morning vs afternoon, credit range, and day preferences
- Block specific instructors
- Deterministic schedule scoring ranks alternatives against your preferences

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

## Native App (Capacitor)

AuraIsHub ships as a Capacitor 8 Android app, wrapping the existing React build in a thin native shell — no rewrite. The `android/` directory is committed. The app is distributed only on Android.

### Native-only features

| Feature | Implementation |
|---|---|
| Push notifications | `@capacitor/push-notifications` + `netlify/functions/lib/push.ts` (FCM v1 / APNs); trade status changes ping watching students |
| Deep links | `auraishub://trading?tradeId=42`, `auraishub://courses?courseCode=...` land on the exact trade/course and highlight it |
| Native share sheet | Timetable screenshots share straight to WhatsApp/Instagram via `@capacitor/share` (web falls back to clipboard) |
| Offline schedule | `src/native/offline.ts` pins the current schedule to IndexedDB; works with zero connectivity |
| Icon badges | `@capawesome/capacitor-badge` shows pending activity; clears on foreground |
| Haptics | Success/error/light feedback on trade actions and calendar swipes |
| Touch gestures | Swipe between weeks/days on the calendar |

### Build & run

```bash
pnpm run build:native   # Production build for native
pnpm run cap:sync       # Sync web build into the native projects
pnpm run cap:build:android  # Open Android Studio (or build APK with Gradle)
```

### CI: build & publish to GitHub Releases

`.github/workflows/build-and-release.yml` builds the signed release APK/AAB and publishes them to a GitHub Release:

- Push a tag matching `v*` (e.g. `git tag v1.2.0 && git push --tags`), or trigger it manually from the Actions tab.
- The `auraishub.apk` is always attached to the release; the AAB is included once the signing secrets below are configured.
- The website's **Download App** button links to the latest release.

To produce a **signed** release build, add these repository secrets (`Settings → Secrets and variables → Actions`):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w 0 app.keystore` output of your `.jks` keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias inside the keystore |
| `ANDROID_KEY_PASSWORD` | Key password |

Without them the workflow still builds and uploads an unsigned APK.

### Push notification setup (production)

Push needs real credentials set on Netlify (Functions): `FCM_PROJECT_ID` and `FCM_SERVICE_ACCOUNT_JSON` (a GCP service account with Firebase Messaging scope). Without them, trade updates still work — pushes simply no-op. The `push_notification_token` column is added to `user_profiles`; run `pnpm run db:push` after merging to apply the schema change.

### Store publishing

`./gradlew assembleRelease` (or `bundleRelease`) in `android/` produces the APK/AAB. The AAB goes to the Google Play Console (one-time $25 developer fee), or you can sideload the APK directly. The deep-link scheme `auraishub` is already declared in `AndroidManifest.xml` and `capacitor.config.ts` (`app.aurais`).

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
