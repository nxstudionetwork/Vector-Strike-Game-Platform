# Vector Strike

**Play. Learn. Level up.** Vector Strike is a global game-based learning platform where students learn academic subjects, practical skills and real-world thinking through playable games, challenges and progression.

This repository has **Phase 1: the platform foundation**. That covers authentication, onboarding, the app shell, Home, Game Zone architecture, Profile, Progress, Achievements and Settings, all built on one central progression engine. The individual games come in later phases and plug into this foundation.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Framer Motion, i18next |
| Backend | Django 5.2, Django REST Framework, SimpleJWT |
| Database | PostgreSQL (SQLite can stand in for quick local development) |
| Real-time (planned) | Django Channels / WebSockets |

## Quick start

**Backend** (Python 3.12+):

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then set SECRET_KEY (and DATABASE_URL for Postgres)
python manage.py migrate        # also seeds categories + achievements
python manage.py createsuperuser  # optional: admin at /admin
python manage.py runserver 127.0.0.1:8000
python manage.py test apps      # run the backend test suite
```

**Explore with demo data (development only).** This creates a demo account, six games labelled "(demo)" (they can't be launched because they have no gameplay module), a daily challenge and real progress made through the progression engine:

```bash
# set DEMO_PASSWORD in backend/.env first (see .env.example)
python manage.py seed_demo          # log in as demo@vectorstrike.test
python manage.py seed_demo --clear  # remove it again
```

For PostgreSQL, run `docker compose up -d db` and set
`DATABASE_URL=postgres://vectorstrike:vectorstrike@localhost:5432/vectorstrike`.

**Frontend** (Node 20+):

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 (proxies /api to Django)
npm run build    # type-check + production build
npm run lint
```

## Architecture

```
backend/apps/
  accounts/       User (email auth), PlayerProfile (public identity), PlayerSettings
  catalog/        Category (Game Zone worlds = onboarding interests), Game, FavoriteGame
                  discovery.py: rule-based recommendations (hook for a future feed engine)
  progression/    GameSession, GameProgress, PlayerStats, RewardLedger, DailyActivity
                  services.py: the ONLY code that changes XP/coins/levels/streaks
                  validators.py: per-game server-side result validators
                  levels.py: level curve
  achievements/   Achievement + UserAchievement; engine.py: pluggable evaluators
  challenges/     DailyChallenge + completion (applied automatically on a qualifying session)
  notifications/  In-app notifications (achievements, level-ups, challenges)

frontend/src/
  app/            router (lazy routes), error boundary, 404
  features/       auth, onboarding, home, game-zone, progress, achievements, profile, settings, notifications
  components/     ui/ (design-system primitives), layout/ (app shell), game/ (game cards)
  games/          game module contract (types.ts) + registry (registry.ts)
  lib/            API client + typed endpoints, query hooks, formatting (Intl)
  i18n/           all user-facing copy (locales/en.json)
  styles/         design tokens (themes, a11y overrides) + global CSS
```

### App shell (Phase 2)
- **Header:** the brand (links to Home), a sidebar toggle, global search (press `/`), streak and level, the notification panel and the profile menu. On phones, search opens as a sheet.
- **Sidebar:** grouped into Main (Home, Game Zone, Daily Challenge), Progress (Progress, Achievements, Stats) and Personal (Favourites, Profile, Settings). It can be collapsed to icons with tooltips, and each device remembers the choice.
- **Phones:** a bottom bar (Home · Games · Challenge · Progress · More). More opens a sheet with the remaining sections, Help and Log out.
- **Shared components:** `components/layout/*`, `components/game/{GameCard,CategoryCard}`, `components/ui/*` (including `XPBar`), `components/feedback/{Toast,ConfirmDialog}`.
- **Adding a section:** add a single entry to `components/layout/navItems.tsx`.

| Route | Page |
|---|---|
| `/home` | Dashboard: welcome + XP + daily goal, continue playing, daily challenge, Game Zone, recommended, achievements, progress, discover |
| `/game-zone` · `/game-zone/category/:slug` · `/game/:slug` | Worlds, games (filters: All, Recommended, New, Popular, In progress, Completed, Favourites), world progress, pre-game screen |
| `/challenge` | Today's challenge, recent history, rules |
| `/progress` · `/stats` · `/achievements` | Level and activity · detailed stats · All / Unlocked / In progress / Locked |
| `/favorites` · `/profile` · `/settings` | Saved games · player identity + editing · grouped settings |
| `/notifications` · `/help` · `/accessibility` | Full notification list · FAQ · accessibility statement |

### Authentication
- Email + password. Passwords are hashed by Django and checked against its password validators.
- The **access token** (15 min) lives only in memory. The **refresh token** lives in an `httpOnly`, `SameSite=Lax` cookie scoped to `/api/auth/`. It is rotated and blacklisted on every use.
- Password reset uses signed, expiring Django tokens. Responses never reveal whether an email has an account.
- Auth endpoints are rate-limited.

### Central progression engine
Games never award rewards themselves. The flow is:

1. `POST /api/play/sessions/` with `{game}`: the server opens a session.
2. `PATCH /api/play/sessions/<id>/checkpoint/`: optional progress and resume state, which powers Continue Playing.
3. `POST /api/play/sessions/<id>/complete/` with `{score, accuracy?, completed?, metrics?}`.

The server checks session ownership, session age, the minimum plausible duration, the score range and any per-game validator. It then computes XP and coins, updates progress, stats and the streak, completes the daily challenge if one applies, evaluates achievements and returns what to celebrate. XP, coins and duration are **never** accepted from the client. Repeat farming of one game earns reduced rewards.

### Adding a game (later phases)
1. Add a `Game` row (admin or a data migration) with a unique `module_key`, `max_score`, `base_xp` and `min_duration_seconds`.
2. Build the gameplay component against `GameModuleProps` in `frontend/src/games/types.ts`.
3. Register it with `register({ key: '<module_key>', load: () => import('./<game>') })` in `frontend/src/games/registry.ts`.
4. Optional: add a server-side result validator in `backend/apps/progression/validators.py`.

### Adding an achievement
Create an `Achievement` row with a `criteria_type` that is registered in `achievements/engine.py`. Built-in types: sessions, completions, categories played, mastery, perfect scores, streaks, daily challenges, level and comebacks. To add a new kind, write one evaluator function.

## API overview

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/signup/ · login/ · refresh/ · logout/` | Session lifecycle |
| `POST /api/auth/password-reset/ · password-reset/confirm/` | Recovery |
| `GET/DELETE /api/me/` · `PATCH /api/me/profile/ · settings/` · `POST /api/me/onboarding/ · password/` | Current learner |
| `GET /api/me/home/ · progress/ · achievements/ · notifications/ · rewards/` | Aggregated pages |
| `GET /api/categories/ · categories/<slug>/` | Worlds |
| `GET /api/games/?category&difficulty&q&status&favorites&played&sort` · `GET /api/games/<slug>/` · `POST/DELETE …/favorite/` | Catalog |
| `POST /api/play/sessions/ · <id>/checkpoint/ · <id>/complete/ · <id>/abandon/` | Play |
| `GET /api/challenges/today/` | Daily challenge |

## Responsible design
- Collects only what is needed: email, player name (no real name), date of birth (for age-appropriate experiences, never shown publicly) and an optional country.
- Avatars are generated presets, so there are no photo uploads.
- Profiles are private by default and always private for under-13s.
- Learners can delete their account from Settings.
- No pay-to-win: XP and coins cannot be bought.
- Accessibility: keyboard navigation, focus states, screen-reader labels, reduced motion, text size, high contrast and a light/dark theme.
