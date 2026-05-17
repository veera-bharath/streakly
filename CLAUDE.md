# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `backend/`)
```bash
npm run dev      # ts-node-dev with hot reload on :3001
npm run build    # tsc → dist/
npm start        # run compiled dist/index.js
```

### Frontend (run from `frontend/`)
```bash
npm run dev      # Vite dev server on :5173
npm run build    # tsc + vite build
npm run preview  # preview production build
```

There are no test scripts in either package — none have been set up yet.

## Architecture

Streakly is a full-stack habit tracker: a **React + Vite + TypeScript** frontend, a **Node.js + Express + TypeScript** backend, **Supabase (PostgreSQL)** as the database, and **Socket.io** for real-time sync across browser tabs.

### Request flow
1. Frontend calls `api.*` functions in `frontend/src/api/client.ts`, which prefix all paths with `/api`.
2. Vite's dev proxy (`vite.config.ts`) rewrites `/api/*` → `http://localhost:3001/*`, so the frontend never needs CORS headers in development.
3. Express routes in `backend/src/routes/` handle the request, validate the JWT via `authenticate` middleware, query Supabase via the `db` client, and return enriched data.
4. After mutations (create/toggle/delete habits), the backend emits a Socket.io event to the user's room (`user:{userId}`). The frontend `useSocket` hook applies those events directly to the Zustand store.

### Database
Supabase is used as a plain PostgreSQL host — **RLS is disabled** on all tables by design. The `db` client in `backend/src/store/db.ts` uses the anon key but runs server-side behind the custom JWT middleware, so RLS is not needed. Tables: `users`, `habits`, `habit_completions` (one row per habit per day, unique constraint enforced).

### State management
`frontend/src/store/useStore.ts` (Zustand) is the single source of truth for `user`, `token`, and `habits`. Auth token is persisted in `localStorage` under `streakly_token`. `initAuth()` is called once at app boot in `App.tsx` to rehydrate the token and validate it against `/auth/me`.

**Important socket/store interaction**: `createHabit` in the store does **not** call `addHabit` after the API resolves — it waits for the `habit:created` socket event instead. This prevents a duplicate entry when the socket fires before the `await` settles.

### Habit enrichment
Every habit object returned by the backend is "enriched" via `enrichHabit()` in `backend/src/routes/habits.ts`. This joins the base `habits` row with all rows from `habit_completions` and computes `streak`, `longestStreak`, and `completedToday` before returning. Streak logic lives in `backend/src/utils/streaks.ts`.

### Auth
- JWT tokens are signed/verified with `JWT_SECRET` (exported from `backend/src/middleware/auth.ts` so it can be reused in the Socket.io handshake in `index.ts`).
- Tokens expire in 7 days.
- Socket.io connections also require a valid JWT passed via `socket.handshake.auth.token`.

## Key Conventions

### Date handling
All dates are ISO strings in `YYYY-MM-DD` format. The helpers `today()` and `toDateStr(date)` in `backend/src/utils/streaks.ts` are the canonical way to produce them. The frontend duplicates this inline where needed (e.g. `Dashboard.tsx`).

### Color and icon assignment
When creating a habit without an explicit color/icon, the backend assigns from `COLORS` and `ICONS` arrays in `backend/src/routes/habits.ts` using `(existingCount % array.length)` as the index.

### Styling
All UI is plain CSS in `frontend/src/index.css` using CSS custom properties (design tokens) defined in `:root`. No CSS-in-JS or utility framework — inline styles are used heavily for component-specific layout, and shared utility classes (`.card`, `.btn`, `.badge`, `.skeleton`, `.stat-card`, etc.) are defined globally. Fonts are `Plus Jakarta Sans` (body) and `JetBrains Mono` (numeric/mono values).

### TypeScript
Both packages use strict TypeScript. The backend extends Express's `Request` with `AuthenticatedRequest` (adds `userId?: string`) in `backend/src/types/index.ts`. The frontend's canonical types are in `frontend/src/types/index.ts`.

## Environment Setup

**backend/.env**
```
PORT=3001
JWT_SECRET=your-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**frontend/.env** (only needed if using Supabase client-side directly)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The backend will throw at startup if `SUPABASE_URL` or `SUPABASE_ANON_KEY` are missing.
