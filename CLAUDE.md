# Stock Analysis Tool

## Project Overview

A web application for analysing US stocks. Users can view historical financials, key ratios, project future prices, and compare stocks.

**Current phase: Phase 1** — Ticker search, company profile, historical price charts, financial statements, and key ratios.

Phase 4 will add Supabase for PostgreSQL database and authentication.

## Architecture

- **Frontend** (`/frontend`): React + TypeScript, Tailwind CSS, Recharts for charts, built with Vite
- **Backend** (`/backend`): Python FastAPI, yfinance for stock data
- **Database** (planned): Supabase (PostgreSQL + auth)

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

## Code Style

- **Frontend**: TypeScript (strict). Keep functions small and well-documented.
- **Backend**: Python with type hints on all function signatures. Keep functions small and well-documented.
- Use descriptive variable and function names.
- Prefer small, focused components and modules over large monolithic files.
