# Streakly — Habit Tracker

A full-stack habit tracking app with real-time sync, per-habit heatmaps, an analytics engine, and smart behavioural insights.

**Live:** [veera-bharath.github.io/streakly](https://veera-bharath.github.io/streakly/) — frontend on GitHub Pages, backend on Render.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Real-time | Socket.io |
| Auth | JWT (7-day expiry) |
| Charts | Recharts |
| State | Zustand |
| Frontend hosting | GitHub Pages (auto-deploy on push) |
| Backend hosting | Render (auto-deploy on push) |

---

## Features

### Habit tracking
- **Daily and weekly habits** — create a habit that must be done every day, or N times per week (1–7 configurable target)
- **Toggle completion** — one click to mark done; undo within 5 seconds via the animated toast
- **Optimistic UI** — completion state flips instantly with automatic rollback if the API call fails
- **Dashboard** — animated progress bar (fills from 0 on load), stat cards with yesterday comparison, per-habit cards
- **Empty states** — friendly prompts when no habits or no data exist yet

### Streaks
- **Daily habits** — consecutive-day streak, counts backwards from today or yesterday
- **Weekly habits** — consecutive-week streak; current week is "in progress" until target is met
- Both show current streak, longest streak, and the correct unit (days / weeks)

### Analytics
- **Overview endpoint** — 7-day rate, 30-day rate, best/worst day of week, consistency score (60 % × 30d rate + 40 % × 7d rate), active streak count
- **Trends endpoint** — weekly bars, 30-day line chart, completion % broken down by day of week (90-day window)
- **Smart insights** — server-generated natural-language messages:
  - *"You are most consistent on Mondays"*
  - *"You miss habits mostly on weekends"*
  - *"🏃 Morning Run is your strongest habit at 83% this month"*
  - *"🔥 Meditation is on a 14-day streak — keep the chain alive!"*

### Heatmap
- GitHub-style contribution grid per habit (365 days)
- 30d / 90d / 1yr range toggle with month labels and hover tooltips

### Real-time sync
- All mutations emit Socket.io events to the user's private room — changes appear instantly across browser tabs

### Mobile UI
- **Floating bottom nav** — pill-shaped card with rounded corners and shadow; icon + label for each route
- **Center "+" button** — prominent green circle in the nav bar opens Add Habit from any page
- **Profile popover** — user avatar initial in the nav; tap to reveal name, email, and sign-out
- **Responsive layout** — desktop shows a fixed sidebar; ≤ 768 px switches to the bottom nav with `overflow-x: hidden` and safe-area padding

### Performance & UX
- **Lazy loading** — Analytics and Heatmap pages load as separate JS chunks; initial bundle is ~400 KB lighter
- **Memoized components** — `HabitCard` and `MiniHeatmap` use `React.memo` with custom comparators to skip re-renders on unrelated state changes
- **Custom hooks** — `useHabits` and `useAnalytics` encapsulate data fetching and memoized stats
- **Micro-interactions** — staggered heatmap cell reveal, spring-style toggle button pop, bouncing empty-state icons, hover lift on cards

---

## Project Structure

```
streakly/
├── .github/workflows/
│   └── deploy-frontend.yml   # GitHub Actions → gh-pages on push to main
│
├── backend/
│   └── src/
│       ├── index.ts              # Express server + Socket.io + CORS
│       ├── middleware/auth.ts    # JWT validation
│       ├── routes/
│       │   ├── auth.ts           # POST /auth/register|login, GET /auth/me
│       │   ├── habits.ts         # CRUD + toggle (daily & weekly)
│       │   └── analytics.ts      # /weekly /monthly /streaks /heatmap /overview /trends
│       ├── store/db.ts           # Supabase client
│       └── utils/
│           ├── streaks.ts        # Daily + weekly streak calculation
│           └── analytics.ts      # Rates, insights, day-of-week breakdown
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Analytics.tsx     # Charts + smart insights banner
│       │   ├── HeatmapPage.tsx
│       │   ├── Login.tsx
│       │   └── Register.tsx
│       ├── components/
│       │   ├── HabitCard.tsx     # Memoized; undo toast, optimistic toggle error flash
│       │   ├── AddHabitModal.tsx # Frequency type + target selector
│       │   ├── MiniHeatmap.tsx   # Memoized; staggered cell reveal animation
│       │   ├── Sidebar.tsx       # Desktop sidebar + mobile floating bottom nav
│       │   └── Skeleton.tsx
│       ├── hooks/
│       │   ├── useHabits.ts      # Habits state + memoized dashboard stats
│       │   ├── useAnalytics.ts   # Parallel analytics fetch + loading/error state
│       │   └── useSocket.ts      # Socket.io real-time sync
│       ├── store/useStore.ts     # Optimistic toggle with rollback; openAddHabit global state
│       └── api/client.ts
│
└── schema_migration.sql          # ALTER TABLE for frequency columns + indexes
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Database setup

Run `schema_migration.sql` in the Supabase SQL Editor once before starting the backend. It adds `frequency_type` / `frequency_target` columns to the `habits` table and creates performance indexes. Existing rows default to `daily / 1`.

### Local development

```bash
git clone https://github.com/veera-bharath/streakly.git
cd streakly

# Backend
cd backend
npm install
cp .env.example .env   # fill in JWT_SECRET and Supabase credentials
npm run dev            # http://localhost:3001

# Frontend (separate terminal)
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `localhost:3001`, so no CORS config is needed locally.

### Environment variables

**`backend/.env`**
```
PORT=3001
JWT_SECRET=change-this-in-production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Frontend** — no `.env` needed for local dev. For a custom production build set:
```
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=https://your-backend.onrender.com
```

---

## Deployment

### Backend (Render)
- Connect the GitHub repo, set root directory to `backend/`, build command `npm install && npm run build`, start command `npm start`
- Add the four environment variables from `backend/.env` in the Render dashboard
- Render auto-deploys on every push to `main`

### Frontend (GitHub Pages)
- The Actions workflow at `.github/workflows/deploy-frontend.yml` builds the frontend and pushes the `dist/` folder to the `gh-pages` branch on every push to `main` that touches `frontend/**`
- Enable GitHub Pages in **Repo → Settings → Pages → Source: `gh-pages` branch → `/` root**
- Live URL: `https://<your-github-username>.github.io/streakly/`

---

## Database Schema

```sql
users              -- accounts (id, username, email, password_hash, created_at)
habits             -- per-user habit definitions
                   --   + frequency_type  TEXT    DEFAULT 'daily'  ('daily' | 'weekly')
                   --   + frequency_target INTEGER DEFAULT 1        (1–7)
habit_completions  -- one row per habit per day (unique constraint on habit_id + date)
```
