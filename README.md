# 🎓 AuraIsHub

A comprehensive web application for course management, schedule optimization, and student trading built with React, TypeScript, and Vite.
## Links
WEBSITE - https://aurais.netlify.app/
GITHUB - https://github.com/moodynooby/Course-Market
## ✨ Features

### 📥 CSV Course Import
- Drag-and-drop CSV upload with strict header validation
- Support for course codes, sections, instructors, schedules, and locations
- Sample data generator for testing
- Real-time parsing with detailed error and warning feedback

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
- Node.js 20+ (or Bun)
- Auth0 account (free tier works)
- Netlify account (free tier works)

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd course-market
   bun install  # or npm install
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
   bun run db:migrate
   ```

6. **Start development server:**
   ```bash
   bun run dev
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

1. Start development server: `bun run dev`
2. Navigate to `http://localhost:3000`
3. Click "Sign In" - should redirect to Auth0
4. After signing in, should redirect back to application

## 📊 CSV Format

The application expects CSV files with the following headers:

| Header | Description | Example |
|--------|-------------|---------|
| Course Code | Unique course identifier | CS 101 |
| Course Name | Full course title | Intro to Computer Science |
| Subject | Academic subject area | CS |
| Section | Section number | 001 |
| Instructor | Professor name | Dr. Smith |
| Days | Class days | MWF |
| Start Time | Class start time | 09:00 |
| End Time | Class end time | 09:50 |
| Credits | Credit hours | 3 |

### Example CSV Data
```csv
Course Code,Course Name,Subject,Section,Instructor,Days,Start Time,End Time,Location,Credits
CS 101,Intro to Computer Science,CS,001,Dr. Smith,MWF,09:00,09:50,Room 101,3
CS 101,Intro to Computer Science,CS,002,Dr. Jones,MWF,10:00,10:50,Room 102,3
MATH 201,Calculus II,MATH,001,Dr. Brown,MWF,08:00,08:50,Room 201,4
```

## 🤖 AI Integration

The application uses browser-based AI (WebLLM) for schedule optimization. This provides AI-powered analysis directly in the browser without requiring a local server.

## 🏗️ Architecture

### Frontend Structure
```
src/
├── components/           # React components
│   ├── CSVUpload.tsx    # CSV import interface
│   ├── CourseList.tsx   # Course browsing
│   ├── PreferencesForm.tsx # User preferences
│   ├── ScheduleView.tsx # Schedule visualization
│   └── TradeBoard.tsx   # Trading platform
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
│   ├── csv.ts          # CSV parsing
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
bun run dev          # Start development server (Vite + Netlify plugin)
bun run build        # Build for production
bun run preview      # Preview production build
bun run test         # Run tests
bun run fix          # Auto-fix linting/formatting
bun run typecheck    # Check TypeScript types
bun run ci           # Full CI check (lint + typecheck + test)
```

### Database Commands

```bash
bun run db:generate  # Generate migration from schema changes
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio (DB GUI)
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

## 📱 Usage Guide

### 1. Sign In
1. Enter your full name
2. Enter your phone number
3. Click "Sign In" to proceed

### 2. Import Courses
1. Click "Import" tab
2. Drag & drop CSV file or click "Load Sample Data"
3. Review import summary and warnings
4. Proceed to browse courses

### 3. Select Courses
1. Click "Courses" tab
2. Filter by subject or search
3. Expand course cards to see available sections
4. Click sections to add to your selection
5. Conflicts are automatically detected

### 4. Set Preferences
1. Click "Preferences" tab
2. Set your ideal time windows
3. Choose preferred days and times
4. Add instructors to exclude
5. Set credit range requirements

### 5. Optimize Schedule
1. Click "Schedule" tab
2. Select desired sections from course browser
3. Click "Optimize with AI" for AI-powered recommendations
4. Review visual schedule and AI analysis
5. Explore alternative schedules

### 6. Trading Board
1. Click "Trading" tab
2. Create your user profile
3. Post trades (offers/requests)
4. Search and filter existing trades
5. Manage your trade status

## 🚀 Deployment

### Netlify Deployment

1. **Configure Production Auth0**:
   - **Allowed Callback URLs**: `https://yourdomain.com/callback`
   - **Allowed Logout URLs**: `https://yourdomain.com`
   - **Allowed Web Origins**: `https://yourdomain.com`

2. **Deploy to Netlify**:
   ```bash
   git push origin main
   ```
   Netlify will automatically build and deploy.

### Environment Variables for Production

Set these in your deployment platform:
```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://auraishub-api
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://auraishub-api
```

DATABASE_URL is automatically set by the Neon addon.

## 🔍 Troubleshooting

### Common Issues

**CSV Import Fails:**
- Check CSV headers match expected format exactly
- Verify time format is HH:MM (24-hour)
- Ensure days are in standard format (M, T, W, Th, F, Sa, Su)

**LLM Not Working:**
- Verify LLM server is running
- Check endpoint URL in environment variables
- Test with deterministic scheduling fallback

**Trading Board Offline:**
- Check if Netlify function URL is set
- Verify database connection (if using PostgreSQL)
- Local storage mode works without backend

**Build Issues:**
- Clear node_modules and reinstall dependencies
- Check TypeScript errors: `bun run typecheck`
- Ensure all environment variables are set

### Auth0 Issues

**"Invalid callback URL" error:**
- Ensure your callback URL is exactly listed in Allowed Callback URLs
- For local development: `http://localhost:3000/callback`
- For production: `https://yourdomain.com/callback`
- No trailing slashes or extra characters

**"Access denied" or login fails:**
- Check that your application type is set to "Single Page Application"
- Verify Allowed Web Origins includes your domain
- Ensure the user has permissions in your Auth0 tenant

**Token validation fails on API calls:**
- Verify the Audience matches your API identifier exactly
- Check that the API is set to use RS256 signing algorithm
- Ensure the token hasn't expired (default is 24 hours)

**Users can't log out:**
- Add your application's base URL to Allowed Logout URLs
- Check that the logout redirect works with your domain

**CORS errors:**
- Ensure Allowed Web Origins includes your exact domain
- For local development, include `http://localhost:3000`
- Do not use wildcards in origins

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

