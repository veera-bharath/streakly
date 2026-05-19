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
1. Frontend calls `api.*` functions in `frontend/src/api/client.ts`. The base URL is `VITE_API_URL` env var (defaults to `/api` so the Vite proxy handles local dev).
2. Vite's dev proxy (`vite.config.ts`) rewrites `/api/*` → `http://localhost:3001/*`.
3. Express routes in `backend/src/routes/` validate the JWT via `authenticate` middleware, query Supabase via the `db` client, and return enriched data.
4. After mutations (create/toggle/delete habits), the backend emits a Socket.io event to the user's room (`user:{userId}`). The frontend `useSocket` hook applies those events directly to the Zustand store.

### Database
Supabase is used as a plain PostgreSQL host — **RLS is disabled** on all tables by design. The `db` client in `backend/src/store/db.ts` uses the anon key but runs server-side behind the custom JWT middleware, so RLS is not needed.

Tables: `users`, `habits`, `habit_completions` (one row per habit per day, unique constraint enforced).

The `habits` table has two extra columns added via `schema_migration.sql`:
- `frequency_type TEXT DEFAULT 'daily'` — `'daily'` or `'weekly'`
- `frequency_target INTEGER DEFAULT 1` — times per week for weekly habits (1–7)

### State management
`frontend/src/store/useStore.ts` (Zustand) is the single source of truth for `user`, `token`, `habits`, and `openAddHabit`. Auth token is persisted in `localStorage` under `streakly_token`. `initAuth()` is called once at app boot in `App.tsx` to rehydrate the token and validate it against `/auth/me`.

`openAddHabit: boolean` / `setOpenAddHabit(v)` controls the Add Habit modal globally. `AddHabitModal` is rendered at the `AppLayout` level in `App.tsx` so it can be opened from any page, including the mobile bottom nav's `+` button.

**Important socket/store interaction**: `createHabit` in the store does **not** call `addHabit` after the API resolves — it waits for the `habit:created` socket event instead. This prevents a duplicate entry when the socket fires before the `await` settles.

### Habit enrichment
Every habit returned by the backend is enriched via `enrichHabit()` in `backend/src/routes/habits.ts`. This joins the base `habits` row with all rows from `habit_completions` and computes `streak`, `longestStreak`, `streakUnit`, `completedToday`, and `completedThisWeek` before returning. Streak logic lives in `backend/src/utils/streaks.ts`.

### Habit types
- **Daily habits** — must be completed every day. Streak unit is `'days'`.
- **Weekly habits** — must be completed `frequencyTarget` times per week. Streak unit is `'weeks'`. The current week is treated as "in progress" so a partial week does not break the streak.
- `completedThisWeek` counts completions in the current Mon–Sun window, regardless of type.

### Analytics
- `GET /analytics/overview` — aggregate completion rates (7d, 30d), best/worst day of week, per-habit consistency score, smart insights, active streak count.
- `GET /analytics/trends` — weekly points, 30-day points, completion % by day of week over 90 days.
- Smart insight generation lives in `backend/src/utils/analytics.ts` → `generateInsights()`.
- Existing endpoints (`/weekly`, `/monthly`, `/streaks`, `/heatmap`) are unchanged.

### Undo feature
`HabitCard` renders a `UndoToast` component whenever `completedToday` transitions from `false` to `true`. The toast auto-dismisses after 5 seconds (animated progress bar) and has an Undo button that calls `toggleHabit` again, which removes the completion via the existing toggle endpoint.

### Auth
- JWT tokens are signed/verified with `JWT_SECRET` (exported from `backend/src/middleware/auth.ts` so it can be reused in the Socket.io handshake in `index.ts`).
- Tokens expire in 7 days.
- Socket.io connections also require a valid JWT passed via `socket.handshake.auth.token`.

### CORS
Both Express and Socket.io allow two origins: `http://localhost:5173` (dev) and `https://veera-bharath.github.io` (production GitHub Pages). Add new origins to the `ALLOWED_ORIGINS` array in `backend/src/index.ts`.

## Deployment

### Frontend — GitHub Pages
- Workflow: `.github/workflows/deploy-frontend.yml` — triggers on push to `main` touching `frontend/**`, builds with `GITHUB_PAGES=true VITE_API_URL=https://streakly-g550.onrender.com VITE_WS_URL=https://streakly-g550.onrender.com`, deploys `frontend/dist/` to the `gh-pages` branch.
- Live URL: `https://veera-bharath.github.io/streakly/`
- The Vite build uses `base: '/streakly/'` when `GITHUB_PAGES=true`. `BrowserRouter` uses `basename` derived from `import.meta.env.BASE_URL`.
- `frontend/public/404.html` redirects unknown paths back to `index.html` with the path encoded as a query param (standard GitHub Pages SPA trick). `index.html` contains the companion script that restores the URL via `history.replaceState`.

### Backend — Render
- Service: `streakly-g550.onrender.com`
- Auto-deploys from the `main` branch on every push.

## Key Conventions

### Date handling
All dates are ISO strings in `YYYY-MM-DD` format. The helpers `today()`, `toDateStr(date)`, and `addDays(dateStr, n)` in `backend/src/utils/streaks.ts` are the canonical way to produce and manipulate them. The frontend duplicates this inline where needed.

### Color and icon assignment
When creating a habit without an explicit color/icon, the backend assigns from `COLORS` and `ICONS` arrays in `backend/src/routes/habits.ts` using `(existingCount % array.length)` as the index.

### Responsive layout
The app has two distinct navigation layouts driven by a `@media (max-width: 768px)` breakpoint in `index.css`:

- **Desktop (> 768 px)** — fixed 248 px sidebar on the left; `main-content` has `margin-left: 248px`.
- **Mobile (≤ 768 px)** — sidebar is hidden; a floating pill-shaped bottom nav (`.bottom-nav` / `.bottom-nav-inner`) appears fixed at the bottom with `border-radius: 28px` and a drop shadow. The nav contains five items: Dashboard, Analytics, a centre `+` circle button (calls `setOpenAddHabit(true)`), Heatmap, and a Profile avatar that opens a sign-out popover. `main-content` switches to `margin-left: 0`, `overflow-x: hidden`, and enough bottom padding to clear the floating nav.

Use `.hide-mobile { display: none !important }` (applied inside the `@media` block) to suppress desktop-only elements on mobile (e.g. the `+ Add Habit` header button on the Dashboard, since the nav `+` handles it).

### Styling
All UI is plain CSS in `frontend/src/index.css` using CSS custom properties (design tokens) defined in `:root`. No CSS-in-JS or utility framework — inline styles are used heavily for component-specific layout, and shared utility classes (`.card`, `.btn`, `.badge`, `.skeleton`, `.stat-card`, `.insight-card`, etc.) are defined globally. Fonts are `Plus Jakarta Sans` (body) and `JetBrains Mono` (numeric/mono values).

### TypeScript
Both packages use strict TypeScript. The backend extends Express's `Request` with `AuthenticatedRequest` (adds `userId?: string`) in `backend/src/types/index.ts`. The frontend's canonical types are in `frontend/src/types/index.ts`. `FrequencyType = 'daily' | 'weekly'` is exported from both.

## Environment Setup

**`backend/.env`**
```
PORT=3001
JWT_SECRET=your-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Frontend** — no `.env` needed for local dev. Production env vars are injected by the GitHub Actions workflow. For a custom production build:
```
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=https://your-backend.onrender.com
GITHUB_PAGES=true
```

The backend will throw at startup if `SUPABASE_URL` or `SUPABASE_ANON_KEY` are missing.
