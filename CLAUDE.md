# Stock Analysis Tool

## Project Overview

A web application for analysing US stocks. Users can view historical financials, key ratios, project future prices, and compare stocks.

**Current phase: Phase 2** — Full stock analysis + macro dashboard + portfolio management + Claude-powered AI analysis pipeline.

## Architecture

- **Frontend** (`/frontend`): React + TypeScript, Tailwind CSS, Recharts for charts, built with Vite
- **Backend** (`/backend`): Python FastAPI. Data providers: yfinance (prices/financials), FMP (transcripts/short interest), NewsAPI (headlines), Anthropic Claude (analysis)
- **Database**: Supabase (PostgreSQL + auth). Backend talks to Supabase via PostgREST (httpx). Frontend has the Supabase JS client for auth (Phase 4).

## Supabase Tables

- `projections` — saved DCF/multiples scenarios
- `stock_analyses` — persisted Claude AI analysis results
- `portfolios` / `positions` — user portfolio holdings
- `user_goals` — investment goal targets

## Key Frontend Patterns

- Data fetching: TanStack React Query v5 (`@tanstack/react-query`)
- Routes: `/` (home/search), `/stock/:ticker` (stock detail), `/dashboard` (macro)
- Services layer: `services/api.ts`, `services/stockApi.ts`, `services/macroApi.ts`, `services/projectionApi.ts`

## Frontend Design System

**Aesthetic:** Deep navy dark theme + amber/gold accent. "Dark Precision Terminal."

**Fonts** (loaded in `index.html` via Google Fonts):
- `font-display` → Barlow Condensed — page headings, brand name, section titles (uppercase + `tracking-wide`)
- `font-mono` → IBM Plex Mono — ALL financial numbers, prices, ratios, tickers, YoY %

**Accent colour:** CSS var `--accent` (amber: `#f59e0b` dark / `#d97706` light). Tailwind tokens: `text-accent`, `bg-accent`, `bg-accent-subtle`, `border-accent`.
- Active tabs/nav: amber underline (`bg-accent` / `border-accent`)
- Ticker badges: `text-accent bg-accent-subtle border border-accent/20 font-mono`
- Links: `text-accent hover:opacity-80`
- Indicator pills active: `bg-accent-subtle text-accent border-accent`
- Focus rings: `focus:ring-accent/40` — never `focus:ring-blue-500`
- AI sparkle icons: `text-accent` — never `text-blue-500`

**Chart tooltips:** Always use `bg-surface border border-border text-text-primary rounded-xl` — never hardcode `bg-gray-900 text-white`.

**Tailwind v4 token pattern:** `@theme { --color-accent: var(--accent); }` generates `text-accent`, `bg-accent` etc. `--font-display` generates `font-display` utility.

**Hero background:** `.bg-grid-pattern` utility class (52px grid) + radial-gradient fade overlay — see `HomePage.tsx`.

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server runs on http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows (Git Bash)
# source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Environment Variables

- **Backend** (`backend/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  Also required: `NEWSAPI_KEY`, `GROQ_API_KEY`, `FMP_API_KEY`, `ANTHROPIC_API_KEY`
- **Frontend** (`frontend/.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

See `backend/.env.example` for reference.

## Backend Routers

`stocks`, `projections`, `macro`, `news`, `goals`, `portfolio`, `analysis`

## Backend Services

- `yahoo_finance.py` — `YahooFinanceProvider` class, all price/financial data
- `fmp.py` — earnings call transcripts (`fetch_latest_transcript`), short interest; FMP short-interest 403 is non-fatal/silenced
- `news.py` — NewsAPI headlines, 5-min in-memory TTL cache
- `sentiment.py` — aggregates news + short interest into signal dict for Claude context
- `claude_analysis.py` — two-step Claude pipeline: `extract_transcript()` then `synthesise_recommendation()`
- `analysis_pipeline.py` — orchestrator: transcript → financials → sentiment → Claude → persist
- `ai_summary.py` — Groq-powered macro indicator summaries with change-detection caching
- `database.py` — PostgREST helpers for projections table
- `portfolio_db.py` / `goals_db.py` / `financials_summary.py` — CRUD and context builders

## Known Gotchas

- Claude API may return JSON wrapped in markdown code fences — strip before `json.loads()`
- FMP short-interest endpoint returns 403 for some tickers — catch and return `None`, don't raise
- Supabase PostgREST requires `"Prefer": "return=representation"` header for INSERT/UPSERT to get the row back

## Code Style

- **Frontend**: TypeScript (strict). Keep functions small and well-documented.
- **Backend**: Python with type hints on all function signatures. Keep functions small and well-documented.
- Use descriptive variable and function names.
- Prefer small, focused components and modules over large monolithic files.
