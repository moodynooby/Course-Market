# 🎓 AuraIsHub

A comprehensive web application for course management, schedule optimization, and student trading built with React, TypeScript, and Vite.
## Links
WEBSITE - https://aurais.netlify.app/
GITHUB - https://github.com/moodynooby/Course-Market
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

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (or pnpm)
- Auth0 account (free tier works)
- Netlify account (free tier works)

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd course-market
   pnpm install  # or npm install
   ```

2. **Link to Netlify** (required for database):
   ```bash
   netlify login
   netlify link
   ```
   Choose existing site or create new one.

3. **Setup Neon Database** (if not already):
   ```bash
   netlify addons:create neon
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Auth0 credentials:
   ```bash
   # Frontend (VITE_ prefix)
   VITE_AUTH0_DOMAIN=your-tenant.auth0.com
   VITE_AUTH0_CLIENT_ID=your_client_id
   VITE_AUTH0_AUDIENCE=https://auraishub-api

   # Backend (no prefix)
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_AUDIENCE=https://auraishub-api
   ```

5. **Run database migrations:**
   ```bash
   pnpm run db:migrate
   ```

6. **Start development server:**
   ```bash
   pnpm run dev
   ```
   Open `http://localhost:3000`

### Auth0 Setup

Create Auth0 application and API:

1. **Single Page Application:**
   - Applications → Create Application → Single Page Application
   - **Allowed Callback URLs**: `http://localhost:3000/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`

2. **Custom API:**
   - Applications → APIs → Create API
   - **Name**: Course Hub API
   - **Identifier**: `https://auraishub-api` (your audience)
   - **Signing Algorithm**: RS256

### Test the Integration

1. Start development server: `pnpm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Sign In" - should redirect to Auth0
4. After signing in, should redirect back to application

## 🤖 AI Integration

The application uses browser-based AI (WebLLM) for schedule optimization. This provides AI-powered analysis directly in the browser without requiring a local server.

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

### Troubleshooting

**"Not linked to a site"**: Run `netlify link` to connect to Netlify site.

**"DATABASE_URL not found"**: 
1. Ensure `netlify link` is run
2. Check Neon addon: `netlify addons:list`
3. Try `netlify addons:create neon`

**"Auth0 configuration incomplete"**:
1. Check `.env` has all required variables
2. Verify Auth0 domain and audience are correct
3. Ensure custom API is created (not Management API)

**"Invalid callback URL"**: Update Auth0 settings to include `http://localhost:3000/callback`.

**Port 3000 in use**: `lsof -ti:3000 | xargs kill -9`

### Environment Variables for Production

check .env.example



