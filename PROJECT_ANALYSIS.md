# PocketCare Project Structure & Download Feature Analysis

## 📊 Project Architecture Overview

### Tech Stack
- **Framework**: React Native + Expo
- **Routing**: Expo Router
- **Authentication**: Clerk (Expo)
- **Database**: Firebase Firestore
- **State Management**: React Context + Local Hooks
- **Storage**: AsyncStorage + Firebase Storage

### Project Structure
```
pocketcare/
├── app/
│   ├── _layout.tsx                 # Root navigation
│   ├── index.tsx                   # Welcome/splash
│   ├── onboarding.tsx              # Onboarding flow
│   ├── (auth)/                     # Auth routes
│   │   ├── _layout.tsx
│   │   └── sign-in.tsx
│   └── (tabs)/                     # Main app routes
│       ├── _layout.tsx             # Tab navigation
│       ├── index.tsx               # Dashboard
│       ├── ai.tsx                  # AI assistant
│       ├── calculator.tsx          # Calculator
│       ├── finance.tsx             # Finance tracker
│       ├── goals.tsx               # Goal management
│       ├── health.tsx              # Health tracking
│       ├── notes.tsx               # Note-taking
│       ├── placement.tsx           # Placement tracking
│       ├── profile.tsx             # User profile ← DOWNLOAD FEATURE HERE
│       ├── schedule.tsx            # Schedule/calendar
│       ├── skills.tsx              # Skill management
│       └── tasks.tsx               # Task management
├── lib/
│   ├── ai-service.ts               # AI service
│   ├── calculator-service.ts       # Calculator history
│   ├── download-service.ts         # ✅ DATA EXPORT SERVICE (NEW)
│   ├── finance-service.ts          # Finance data
│   ├── games-service.ts            # Game scores
│   ├── goals-service.ts            # Goals data
│   ├── health-service.ts           # Health data
│   ├── notes-service.ts            # Notes data
│   ├── placement-service.ts        # Placement data
│   ├── schedule-service.ts         # Schedule/events
│   ├── skills-service.ts           # Skills data
│   ├── streak-service.ts           # Streak tracking
│   ├── tasks-service.ts            # Tasks data
│   └── widget-service.ts           # Widgets
├── components/
│   ├── AnimatedTabButton.tsx
│   ├── FloatingActionButton.tsx
│   ├── LockScreen.tsx
│   ├── MemoryGameComponent.tsx
│   ├── TapGameComponent.tsx
│   ├── themed-text.tsx
│   └── themed-view.tsx
├── context/
│   └── ThemeContext.tsx            # Dark/Light mode
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-greeting.ts
│   └── use-theme-color.ts
├── utils/
│   ├── deviceAuth.ts               # Biometric auth
│   └── notifications.ts            # Push notifications
├── constants/
│   ├── card-system.ts              # UI design
│   ├── styles.ts                   # Colors & styles
│   └── theme.ts                    # Theme config
├── assets/
│   ├── animations/                 # Lottie animations
│   ├── Font/                       # Custom fonts
│   └── images/                     # App images
├── scripts/
│   ├── fix-clerk-codegen.js        # Clerk setup
│   ├── send-cron-notifications.js  # Cron jobs
│   └── send-test-push.js           # Test push notifications
└── firebaseConfig.ts               # Firebase setup
```

---

## 🗄️ Firestore Database Structure

### Collection Names & Email-Based Documents

| Collection | Type | Access Pattern | Data Structure |
|-----------|------|-----------------|-----------------|
| **finance** | lowercase | `doc(db, 'finance', email)` | `{ transactions: [], debts: [], goals: [] }` |
| **Goals** | PascalCase | `doc(db, 'Goals', email)` | `{ goals: [] }` |
| **health** | lowercase | `doc(db, 'health', email)` | `{ medical: [], food_diet: [], fitness: [] }` |
| **Notes** | PascalCase | `doc(db, 'Notes', email)` | `{ notes: [] }` |
| **Placements** | PascalCase | `doc(db, 'Placements', email)` | `{ placements: [] }` |
| **schedules** | lowercase | `doc(db, 'schedules', email)` | `{ events: [] }` |
| **Skills** | PascalCase | `doc(db, 'Skills', email)` | `{ skills: [] }` |
| **Tasks** | PascalCase | `doc(db, 'Tasks', email)` | `{ tasks: [] }` |

### Key Pattern
- **Document ID**: User's email (from Clerk)
- **Sub-arrays**: Each document contains arrays of items (transactions, notes, goals, etc.)
- **No server-side relations**: All data flattened in single documents

---

## 📥 Download Feature Architecture

### File: `lib/download-service.ts`

**Imported Endpoints:**
```typescript
getFinanceData(email: string)      → { transactions, debts, goals }
getGoals(email: string)            → Goal[]
getHealthData(email: string)       → { medical, food_diet, fitness }
getNotes(email: string)            → Note[]
getPlacements(email: string)       → Placement[]
getScheduleEvents(email: string)   → ScheduleEvent[]
getSkills(email: string)           → Skill[]
getTasks(email: string)            → Task[]
```

**Main Functions:**

1. **`downloadAllUserData(email: string)`**
   - Fetches all 8 data types in parallel using `Promise.all()`
   - Each fetch is error-isolated (one failure doesn't block others)
   - Returns `UserDataExport` object with all data
   - Logs each data fetch for debugging

2. **`exportToJSON(data)`**
   - Converts `UserDataExport` to formatted JSON string
   - Uses 2-space indentation for readability

3. **`createDownloadFile(data)`**
   - Returns JSON string ready to be written to file

---

## 👤 User Flow: Profile Page Download

### File: `app/(tabs)/profile.tsx`

**Button Location:**
- Profile page, below "Play Games" section, above "Made by" footer
- Blue (#3B82F6) background with download icon

**Handler Function: `handleDownloadData()`**

```
1. Get user email from Clerk authentication
2. Click "Download Your Data" button
   ↓
3. Show loading spinner, disable button
   ↓
4. Call `downloadAllUserData(email)` - fetches from Firestore
   ↓
5. Convert to JSON using `createDownloadFile()`
   ↓
6. Write to cache directory using `FileSystem.writeAsStringAsync()`
   ↓
7. Open native Share sheet using `Share.share()`
   ↓
8. User selects where to save:
   - Files app (Downloads folder)
   - Google Drive
   - OneDrive
   - Email
   - Cloud storage apps
   ↓
9. Show success alert with filename
```

---

## 📋 Exported File Format

**Filename:** `PocketCare-YYYY-MM-DD.json`

**JSON Structure:**
```json
{
  "exportDate": "2026-04-11T16:45:38.789Z",
  "exportedBy": "user@example.com",
  "finance": {
    "transactions": [
      {
        "id": "...",
        "type": "income|expense",
        "amount": 1000,
        "category": "...",
        "note": "...",
        "date": "2026-04-11",
        "created_at": "2026-04-11T..."
      }
    ],
    "debts": [...],
    "goals": [...]
  },
  "goals": [
    {
      "id": "...",
      "title": "...",
      "category": "career|health|finance|personal",
      "status": "active|achieved|paused",
      "priority": "low|medium|high",
      "target_value": 100,
      "current_value": 50,
      "created_at": "2026-04-11T...",
      "tasks": [...]
    }
  ],
  "health": {
    "medical": [
      {
        "id": "...",
        "topic": "...",
        "description": "...",
        "start_date": "2026-04-11",
        "end_date": "2026-04-15",
        "created_at": "..."
      }
    ],
    "food_diet": [...],
    "fitness": [...]
  },
  "notes": [
    {
      "id": "...",
      "title": "...",
      "content": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "placement": [
    {
      "id": "...",
      "company_name": "...",
      "status": "applied|interview|offer|rejected",
      "date": "2026-04-11",
      "studied": true|false,
      "rounds": [
        {
          "id": "...",
          "topic": "...",
          "description": "...",
          "result": "success|rejected|pending"
        }
      ],
      "created_at": "..."
    }
  ],
  "schedule": [
    {
      "id": "...",
      "title": "...",
      "purpose": "...",
      "date": "2026-04-11",
      "startTime": "09:00",
      "endTime": "10:00",
      "location": "...",
      "priority": "High|Medium|Low",
      "status": "Upcoming|Completed|Cancelled",
      "reminder": true|false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "skills": [
    {
      "id": "...",
      "name": "JavaScript",
      "level": "beginner|intermediate|advanced",
      "progress": [
        {
          "id": "...",
          "title": "Learn basics",
          "completed": true
        }
      ],
      "created_at": "..."
    }
  ],
  "tasks": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "status": "pending|completed",
      "priority": "low|medium|high",
      "due_date": "2026-04-11",
      "created_at": "..."
    }
  ]
}
```

---

## 🔍 Debugging Checklist

### ✅ To Verify Download Feature is Working:

1. **Authentication**
   - [ ] User is logged in via Clerk
   - [ ] Email visible in profile
   - [ ] Console shows: `🔍 Downloading data for user: bsgnath18@gmail.com`

2. **Data Fetching**
   - [ ] Console shows each service call:
     - `✅ Finance data: {...}`
     - `✅ Goals data: {...}`
     - `✅ Health data: {...}`
     - etc.
   - [ ] At least one data type has content (not empty)

3. **File Creation**
   - [ ] Console shows: `📋 Data exported to: file://...`
   - [ ] Native share sheet appears
   - [ ] File can be saved to device

4. **Data Retrieval** (If file appears empty)
   - [ ] Check if user has created data in each section:
     - Finance tab - add a transaction
     - Goals tab - create a goal
     - Health tab - add health record
     - Notes tab - create a note
     - Placement tab - add placement
     - Schedule tab - create event
     - Skills tab - add a skill
     - Tasks tab - create a task
   - [ ] Re-run download after adding data

---

## 🚀 How to Test the Complete Feature

### Test Scenario: Export Complete User Profile

1. **Setup Phase**
   ```
   - Login with test account
   - Add sample data across multiple sections (Finance, Goals, etc.)
   ```

2. **Export Phase**
   ```
   - Navigate to Profile
   - Click "Download Your Data"
   - Wait for "Exporting..." state
   - Select save location from share sheet
   ```

3. **Verification Phase**
   ```
   - Open saved JSON file in text editor
   - Verify all 8 sections are present
   - Check that data matches what was created
   - Verify timestamps and formatting
   ```

4. **Edge Cases to Test**
   ```
   - Cancel share sheet → verify alert shown
   - No data in some sections → verify empty arrays
   - Very large data (many items) → verify file size reasonable
   - Network issues → verify error handling
   - Different email formats → verify email used correctly
   ```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROFILE PAGE                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Click "Download Your Data" Button                       │ │
│  │ (Blue, #3B82F6)                                         │ │
│  └────────┬─────────────────────────────────────────────────┘ │
│           │                                                    │
│           ▼                                                    │
│  handleDownloadData() starts                                  │
│  setIsDownloading(true) → Shows spinner                      │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────────┐
        │  downloadAllUserData(email)          │
        │  (lib/download-service.ts)           │
        │                                       │
        │  Parallel fetch with Promise.all()    │
        └───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   FIREBASE FIRESTORE
   
   finance ──────► { transactions, debts, goals }
   Goals ─────────► Goal[]
   health ────────► { medical, food_diet, fitness }
   Notes ─────────► Note[]
   Placements ────► Placement[]
   schedules ─────► ScheduleEvent[]
   Skills ────────► Skill[]
   Tasks ─────────► Task[]
        │
        └─────────────────┬─────────────────┘
                          ▼
        ┌───────────────────────────────────────┐
        │  UserDataExport object constructed   │
        │  - exportDate: ISO string             │
        │  - exportedBy: user email             │
        │  - All 8 data types included          │
        └───────────────────────────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────────┐
        │  exportToJSON(data)                  │
        │  - Stringify with 2-space indent      │
        │  - Return formatted JSON string       │
        └───────────────────────────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────────┐
        │  createDownloadFile(userData)        │
        │  - fileName: PocketCare-YYYY-MM-DD   │
        │  - filePath: cache directory          │
        │  - Return JSON string                 │
        └───────────────────────────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────────┐
        │  FileSystem.writeAsStringAsync()     │
        │  - Write to: cacheDirectory/file.json │
        │  - Makes file available on device     │
        └───────────────────────────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────────┐
        │  Share.share() - Native Share Sheet  │
        │  - User selects save location:        │
        │    • Files app (Downloads)            │
        │    • Google Drive                     │
        │    • OneDrive                         │
        │    • Email                            │
        │    • Cloud storage apps               │
        └───────────────────────────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────────┐
        │  setIsDownloading(false)             │
        │  Show Success Alert                   │
        │  File ready for download/sharing      │
        └───────────────────────────────────────┘
```

---

## ✅ Implementation Status: COMPLETE

### What's Done
- ✅ Download service created with all 8 data types
- ✅ Profile page integrated with download button
- ✅ Native file system + sharing implemented
- ✅ Error handling for all scenarios
- ✅ Comprehensive logging for debugging
- ✅ Type-safe TypeScript implementation
- ✅ Proper async/await pattern
- ✅ Dependency management (expo-file-system/legacy)

### How to Consider Feature "Done"
1. User creates sample data across multiple sections
2. Clicks "Download Your Data" button
3. Receives JSON file with all their data
4. Can save/share the file via native OS features
5. JSON file opens and shows complete user profile

---

## 🎯 Next Steps for Verification

1. **Add Test Data** - Create entries in each module
2. **Download** - Click the download button
3. **Check Console** - Verify all data fetches succeed
4. **Inspect JSON** - Open file and verify data present
5. **Celebrate** 🎉

