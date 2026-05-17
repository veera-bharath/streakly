# 🔥 Streakly — Habit Tracker

> **Work in Progress** — actively being built. Expect breaking changes.

A full-stack habit tracking application with real-time sync, GitHub-style heatmaps, and analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Real-time | Socket.io |
| Auth | JWT (custom) |
| Charts | Recharts |
| State | Zustand |

## Features

- **Dashboard** — Daily habit tracking with animated progress bar, trend indicators (vs yesterday), and contextual greeting
- **Habit Cards** — Per-habit 16-week heatmap grid, streak tracking, 30-day completion rate
- **Analytics** — Weekly bar chart, 30-day trend line, insight cards (best/worst habit, most consistent day)
- **Heatmap Page** — GitHub-style contribution grids per habit with 30d / 90d / 1yr filter and hover tooltips
- **Real-time Sync** — Changes propagate instantly across browser tabs via Socket.io
- **Auth** — JWT-based register/login with secure routes

## Planned Features

- [ ] Mobile app (React Native) — same design system
- [ ] Habit categories and tags
- [ ] Reminders / notifications
- [ ] Social / accountability partner mode
- [ ] Dark mode toggle
- [ ] Export data (CSV / JSON)
- [ ] Habit templates

## Project Structure

```
streakly/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── index.ts          # Server entry + Socket.io setup
│   │   ├── middleware/auth.ts # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.ts       # POST /auth/register|login, GET /auth/me
│   │   │   ├── habits.ts     # CRUD + toggle
│   │   │   └── analytics.ts  # Weekly, monthly, streaks, heatmap
│   │   ├── store/db.ts       # Supabase client
│   │   └── utils/streaks.ts  # Streak calculation logic
│   └── package.json
│
└── frontend/                 # React + Vite SPA
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
        ├── store/useStore.ts  # Zustand global state
        ├── hooks/useSocket.ts # Socket.io real-time
        └── api/client.ts     # Typed fetch wrapper
```

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone

```bash
git clone https://github.com/veera-bharath/streakly.git
cd streakly
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY in .env
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment Variables

**backend/.env**
```
PORT=3001
JWT_SECRET=your-secret-here
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
habit_completions  -- one row per habit × day (unique constraint)
```

---

> Built with ☕ — contributions and feedback welcome once out of WIP.
