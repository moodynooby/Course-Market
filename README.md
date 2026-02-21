# 🎓 AuraIsHub

A comprehensive web application for course management, schedule optimization, and student trading built with React, TypeScript, and Vite.

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
- Node.js 20+ 
- npm or yarn
- (Optional) Netlify account for deployment

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd course-market
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:5173
   ```

### Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Configure environment variables:

```bash
# Auth0 Configuration (Required)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://your-api-identifier

# Netlify function URL (optional)
VITE_NETLIFY_FUNCTION_URL=https://your-site.netlify.app/.netlify/functions

# Database URL (for Netlify functions)
DATABASE_URL=your_neon_database_url
```

## 🔐 Auth0 Authentication Setup

This application uses Auth0 for user authentication. Follow these steps to configure Auth0 for your project.

### Step 1: Create an Auth0 Account

1. Go to [Auth0](https://auth0.com/) and sign up for a free account
2. Verify your email address
3. Create your tenant domain (e.g., `your-app.auth0.com`)

### Step 2: Create a Single Page Application

1. In the Auth0 Dashboard, navigate to **Applications** → **Applications**
2. Click **Create Application**
3. Select **Single Page Application** as the application type
4. Click **Create**

### Step 3: Configure Application Settings

In your application settings, configure the following:

| Setting | Value |
|---------|-------|
| **Name** | Course Hub |
| **Allowed Callback URLs** | `http://localhost:5173/callback` (development), `https://yourdomain.com/callback` (production) |
| **Allowed Logout URLs** | `http://localhost:5173` (development), `https://yourdomain.com` (production) |
| **Allowed Web Origins** | `http://localhost:5173` (development), `https://yourdomain.com` (production) |
| **Refresh Token Rotation** | Enabled |

### Step 4: Create an API (for Token Validation)

1. In the Auth0 Dashboard, navigate to **Applications** → **APIs**
2. Click **Create API**
3. Enter the following:
   - **Name**: Course Hub API
   - **Identifier**: `https://your-api-identifier` (this becomes your `VITE_AUTH0_AUDIENCE`)
   - **Signing Algorithm**: RS256
4. Click **Create**

### Step 5: Update Environment Variables

Add your Auth0 credentials to the `.env` file:

```bash
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://your-api-identifier
```

You can find these values in your Auth0 application settings:
- **Domain**: Shown at the top of your application settings
- **Client ID**: Shown in the "Basic Information" section
- **Audience**: The identifier you set when creating the API

### Step 6: Test the Integration

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click "Sign In" - you should be redirected to Auth0
4. After signing in, you should be redirected back to the application

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
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Database Setup (Optional)

For Netlify deployment with PostgreSQL:

1. **Create Neon database**: https://neon.tech/
2. **Set environment variables**:
   ```bash
   DATABASE_URL=your_neon_connection_string
   ```
3. **Deploy to Netlify** with database access

### Local Storage Fallback

The application includes comprehensive local storage fallback:
- Courses and sections persisted locally
- User preferences saved across sessions
- Trading data stored in browser storage
- No backend required for full functionality

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

1. **Connect repository** to Netlify
2. **Set environment variables** in Netlify dashboard
3. **Deploy** with automatic builds on push

### Vercel/Other Platforms

The application can be deployed to any static hosting platform:
- Build: `npm run build`
- Output: `dist/` directory
- Functions: Configure for Netlify Functions if needed

### Auth0 Production Configuration

When deploying to production, you must update your Auth0 application settings to match your production domain.

#### Step 1: Update Allowed URLs

In your Auth0 Dashboard, go to **Applications** → **Your Application** → **Settings**:

| Setting | Development | Production |
|---------|-------------|------------|
| **Allowed Callback URLs** | `http://localhost:5173/callback` | `https://yourdomain.com/callback` |
| **Allowed Logout URLs** | `http://localhost:5173` | `https://yourdomain.com` |
| **Allowed Web Origins** | `http://localhost:5173` | `https://yourdomain.com` |

**Important:** Add both development and production URLs separated by commas if you need to support both environments.

#### Step 2: Configure Production Environment Variables

Set these environment variables in your production deployment platform:

```bash
# Auth0 Configuration (Production)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://your-api-identifier

# Optional: Netlify function URL for production
VITE_NETLIFY_FUNCTION_URL=https://your-site.netlify.app/.netlify/functions
```

#### Step 3: Update Auth0 API Settings

1. Go to **Applications** → **APIs** → **Your API**
2. Verify the **Identifier** matches your `VITE_AUTH0_AUDIENCE` exactly
3. Ensure **Signing Algorithm** is set to RS256
4. Under **Settings**, verify **Token Expiration** is appropriate (default: 86400 seconds = 24 hours)

#### Step 4: Configure Refresh Token Rotation (Production)

In your Auth0 application settings:

1. Scroll to **Refresh Token Rotation**
2. Enable **Refresh Token Rotation**
3. Set **Refresh Token Expiration** (recommended: 1 week for production)
4. This allows users to stay logged in without re-authenticating frequently

#### Step 5: Production Security Settings

Under **Application Properties** in Auth0:

| Setting | Recommended Value |
|---------|-------------------|
| **OIDC Conformant** | Enabled (ON) |
| **Allow Offline Access** | Enabled (ON) |
| **Token Endpoint Authentication Method** | `client_secret_basic` or `none` for SPA |

#### Step 6: Test Production Deployment

After configuring Auth0 for production:

1. Deploy your application to production
2. Clear browser cache and cookies
3. Navigate to your production URL
4. Click "Sign In" - should redirect to Auth0 login
5. After authentication, should redirect back to `/callback` then home
6. Verify the URL shows your production domain
7. Test logout functionality

#### Step 7: Monitor Auth0 Dashboard

After going live:

1. Check **Dashboard** → **Analytics** for active users
2. Monitor **Dashboard** → **Logs** for any errors
3. Set up alerts for failed login attempts
4. Review **Users** to see authenticated users

#### Troubleshooting Production Auth0

**Issue:** Users can't log in after deployment
- Verify all production URLs are in Allowed Callback/Logout/Web Origins
- Check for typos in environment variables
- Ensure domain matches exactly (no trailing slashes)

**Issue:** Token validation fails
- Verify `VITE_AUTH0_AUDIENCE` matches API Identifier exactly
- Check that API is using RS256 signing algorithm
- Ensure token hasn't expired

**Issue:** CORS errors in production
- Add production domain to Allowed Web Origins
- Do not use wildcards (`*`) in origins
- Include both `http` and `https` if needed

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
- Check TypeScript errors: `npm run lint`
- Ensure all environment variables are set

### Auth0 Issues

**"Invalid callback URL" error:**
- Ensure your callback URL is exactly listed in Allowed Callback URLs
- For local development: `http://localhost:5173/callback`
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

**Too many redirects:**
- Clear browser cookies and local storage
- Check that redirect_uri matches exactly in your configuration
- Verify you're not already authenticated in another session

**Auth0 free tier limits:**
- Free tier includes 7,500 monthly active users (MAU)
- Monitor usage in Auth0 Dashboard → Analytics
- Consider upgrading if you expect more users

**CORS errors:**
- Ensure Allowed Web Origins includes your exact domain
- For local development, include `http://localhost:5173`
- Do not use wildcards in origins

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React 19 with TypeScript
- Vite build tool
- WebLLM for browser-based AI
- Netlify functions for serverless API
- Neon PostgreSQL for database
- Modern UI design patterns

---

Built with ❤️ for better course scheduling and student collaboration.