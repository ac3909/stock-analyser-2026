# Stock Analysis Tool

## Project Overview

A web application for analysing US stocks. Users can view historical financials, key ratios, project future prices, and compare stocks.

**Current phase: Phase 1** — Ticker search, company profile, historical price charts, financial statements, and key ratios.

## Architecture

- **Frontend** (`/frontend`): React + TypeScript, Tailwind CSS, Recharts for charts, built with Vite
- **Backend** (`/backend`): Python FastAPI, yfinance for stock data
- **Database**: Supabase (PostgreSQL + auth). Backend talks to Supabase via PostgREST (httpx). Frontend has the Supabase JS client for auth (Phase 4).

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
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
- **Frontend** (`frontend/.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

See `backend/.env.example` for reference.

## Code Style

- **Frontend**: TypeScript (strict). Keep functions small and well-documented.
- **Backend**: Python with type hints on all function signatures. Keep functions small and well-documented.
- Use descriptive variable and function names.
- Prefer small, focused components and modules over large monolithic files.
