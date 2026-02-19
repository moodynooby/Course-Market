# 🎓 Course Hub

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
# Netlify function URL (optional)
VITE_NETLIFY_FUNCTION_URL=https://your-site.netlify.app/.netlify/functions

# Database URL (for Netlify functions)
DATABASE_URL=your_neon_database_url
```

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