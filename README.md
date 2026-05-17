# Streakly — Habit Tracker

**Status: Work in progress.** The API and data model may change without notice.

A full-stack habit tracking application with real-time sync, per-habit heatmaps, and analytics.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Real-time | Socket.io |
| Auth | JWT |
| Charts | Recharts |
| State | Zustand |

## Features

- **Dashboard** — Daily habit tracking with progress bar and trend indicators vs yesterday
- **Habit cards** — 16-week heatmap grid per habit, streak counter, 30-day completion rate
- **Analytics** — Weekly bar chart, 30-day trend line, best/worst habit insights, most consistent day
- **Heatmap page** — Contribution grids per habit with 30d / 90d / 1yr filter and hover tooltips
- **Real-time sync** — Changes propagate across browser tabs via Socket.io
- **Auth** — JWT-based register and login

## Planned

- Mobile app (React Native) with the same design system
- Habit categories and tags
- Reminders and push notifications
- Social / accountability features
- Dark mode
- Data export (CSV, JSON)

## Project Structure

```
streakly/
├── backend/
│   └── src/
│       ├── index.ts              # Server entry + Socket.io
│       ├── middleware/auth.ts    # JWT validation
│       ├── routes/
│       │   ├── auth.ts           # POST /auth/register|login, GET /auth/me
│       │   ├── habits.ts         # CRUD + toggle
│       │   └── analytics.ts      # Weekly, monthly, streaks, heatmap
│       ├── store/db.ts           # Supabase client
│       └── utils/streaks.ts      # Streak calculation
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx
        │   ├── Analytics.tsx
        │   ├── HeatmapPage.tsx
        │   ├── Login.tsx
        │   └── Register.tsx
        ├── components/
        │   ├── HabitCard.tsx
        │   ├── MiniHeatmap.tsx
        │   ├── Sidebar.tsx
        │   ├── AddHabitModal.tsx
        │   └── Skeleton.tsx
        ├── store/useStore.ts     # Zustand global state
        ├── hooks/useSocket.ts    # Socket.io client
        └── api/client.ts         # Typed fetch wrapper
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
git clone https://github.com/veera-bharath/streakly.git
cd streakly

# Backend
cd backend
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment Variables

**backend/.env**
```
PORT=3001
JWT_SECRET=your-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**frontend/.env**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

```sql
users              -- accounts with hashed passwords
habits             -- habit definitions per user
habit_completions  -- one row per habit per day (unique constraint)
```
