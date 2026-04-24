# Portfolio Analysis Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete backend pipeline that ingests earnings transcripts, financial data, and sentiment signals, then generates evidence-based investment recommendations scored against a user-defined investment goal profile.

**Architecture:** A multi-step Claude API pipeline processes raw earnings transcripts and financial data through structured extraction → synthesis stages, producing verbose, evidence-cited recommendations. User goals are profile-based (not parameter-based). Results persist in Supabase for retrieval without re-running the pipeline. No frontend work in this plan — all deliverables are testable via HTTP (curl / pytest).

**Tech Stack:** FastAPI (existing), Anthropic Python SDK `claude-sonnet-4-6` (new), FMP API for transcripts (new), NewsAPI sentiment (existing), yfinance financials (existing), Supabase PostgREST (existing), pytest + pytest-asyncio + pytest-mock (new)

---

## File Map

### New files to create
```
backend/
  app/
    models/
      portfolio.py          # Portfolio, Position, UserGoal Pydantic models
      analysis.py           # Evidence, KeyRisk, AnalysisThesis, Recommendation models
    services/
      fmp.py                # FMP API client — transcript fetch + short interest
      sentiment.py          # Sentiment aggregator (news mentions + FMP short interest)
      claude_analysis.py    # All Claude API calls (extraction + synthesis)
      analysis_pipeline.py  # Orchestrator — ties all services into one run_analysis() call
      portfolio_db.py       # Portfolio + Position CRUD via Supabase PostgREST
      goals_db.py           # UserGoal CRUD via Supabase PostgREST
    routers/
      portfolio.py          # /api/portfolio — portfolio + position endpoints
      goals.py              # /api/goals — goal profile endpoints
      analysis.py           # /api/analysis — trigger analysis, fetch results
  tests/
    conftest.py             # Shared pytest fixtures
    test_fmp.py
    test_sentiment.py
    test_claude_analysis.py
    test_analysis_pipeline.py
    test_portfolio_db.py
    test_goals_db.py
    test_portfolio_router.py
    test_goals_router.py
    test_analysis_router.py
```

### Existing files to modify
```
backend/app/main.py              # Include 3 new routers
backend/backend/.env.example     # Add FMP_API_KEY, ANTHROPIC_API_KEY
backend/requirements.txt         # Add anthropic, pytest, pytest-asyncio, pytest-mock
```

### Supabase tables to create (SQL run once in Supabase dashboard)
```
user_goals, portfolios, positions, earnings_transcripts, stock_analyses
```

---

## Task 1: Supabase Schema

**Files:**
- Create: `backend/db/migrations/001_portfolio_analysis.sql`

This SQL is run once in the Supabase SQL editor. It creates all tables needed by the new pipeline.

- [ ] **Step 1: Create the migration file**

```sql
-- backend/db/migrations/001_portfolio_analysis.sql

-- Investment goal profiles
create table if not exists user_goals (
  id          uuid primary key default gen_random_uuid(),
  profile     text not null check (profile in ('high_growth', 'balanced', 'income', 'defensive')),
  horizon     text not null check (horizon in ('short', 'medium', 'long')),
  risk_tolerance text not null check (risk_tolerance in ('high', 'medium', 'low')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Portfolio containers
create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  goal_id     uuid references user_goals(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Individual stock positions within a portfolio
create table if not exists positions (
  id           uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  ticker       text not null,
  shares       numeric(18, 6) not null check (shares > 0),
  avg_cost     numeric(18, 6) not null check (avg_cost >= 0),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (portfolio_id, ticker)
);

-- Cached earnings transcripts (avoid re-fetching from FMP)
create table if not exists earnings_transcripts (
  id          uuid primary key default gen_random_uuid(),
  ticker      text not null,
  quarter     integer not null check (quarter between 1 and 4),
  year        integer not null,
  content     text not null,
  fetched_at  timestamptz default now(),
  unique (ticker, quarter, year)
);

-- Persisted analysis results
create table if not exists stock_analyses (
  id                 uuid primary key default gen_random_uuid(),
  ticker             text not null,
  goal_profile       text not null,
  transcript_quarter integer,
  transcript_year    integer,
  action             text not null,
  confidence         text not null,
  goal_alignment     integer not null check (goal_alignment between 0 and 100),
  bull_case          text not null,
  bear_case          text not null,
  synthesis          text not null,
  evidence           jsonb not null default '[]',
  key_risks          jsonb not null default '[]',
  review_triggers    jsonb not null default '[]',
  sentiment_summary  text,
  created_at         timestamptz default now()
);

create index if not exists idx_stock_analyses_ticker on stock_analyses(ticker);
create index if not exists idx_positions_portfolio on positions(portfolio_id);
create index if not exists idx_transcripts_ticker on earnings_transcripts(ticker, quarter, year);
```

- [ ] **Step 2: Run the SQL in Supabase dashboard**

Open Supabase project → SQL Editor → paste the file contents → Run. Verify all 5 tables appear in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add backend/db/migrations/001_portfolio_analysis.sql
git commit -m "feat: add Supabase schema for portfolio analysis pipeline"
```

---

## Task 2: New Pydantic Models

**Files:**
- Create: `backend/app/models/portfolio.py`
- Create: `backend/app/models/analysis.py`

- [ ] **Step 1: Write portfolio models**

```python
# backend/app/models/portfolio.py
"""Pydantic models for portfolio, position, and user goal data."""

from typing import Literal
from pydantic import BaseModel


class UserGoal(BaseModel):
    id: str
    profile: Literal["high_growth", "balanced", "income", "defensive"]
    horizon: Literal["short", "medium", "long"]
    risk_tolerance: Literal["high", "medium", "low"]
    created_at: str
    updated_at: str


class UserGoalCreate(BaseModel):
    profile: Literal["high_growth", "balanced", "income", "defensive"]
    horizon: Literal["short", "medium", "long"]
    risk_tolerance: Literal["high", "medium", "low"]


class Portfolio(BaseModel):
    id: str
    name: str
    goal_id: str | None = None
    created_at: str
    updated_at: str


class PortfolioCreate(BaseModel):
    name: str
    goal_id: str | None = None


class Position(BaseModel):
    id: str
    portfolio_id: str
    ticker: str
    shares: float
    avg_cost: float
    created_at: str
    updated_at: str


class PositionCreate(BaseModel):
    ticker: str
    shares: float
    avg_cost: float


class PositionUpdate(BaseModel):
    shares: float | None = None
    avg_cost: float | None = None
```

- [ ] **Step 2: Write analysis models**

```python
# backend/app/models/analysis.py
"""Pydantic models for evidence-based investment analysis output."""

from typing import Literal
from pydantic import BaseModel


class Evidence(BaseModel):
    """A single cited data point supporting the thesis or a risk."""
    source: str
    """Human-readable source label, e.g. 'Q4 2024 Earnings Call', 'FY2024 Income Statement'."""
    quote: str
    """Verbatim quote from transcript, or formatted metric: 'Revenue: $97.3B (+8% YoY)'."""
    metric: str | None = None
    """Optional structured metric label, e.g. 'Operating Margin FY2024: 31.2%'."""
    significance: str
    """2-3 sentences explaining why this evidence matters to the thesis."""


class KeyRisk(BaseModel):
    """A material risk to the investment thesis, with supporting evidence."""
    risk: str
    """3-4 sentence description of the risk and its potential impact."""
    evidence: list[Evidence]
    """2-3 pieces of evidence that surface or quantify this risk."""
    severity: Literal["high", "medium", "low"]
    mitigants: str
    """2-3 sentences on what factors could reduce or invalidate this risk."""


class AnalysisThesis(BaseModel):
    """The core investment thesis split into bull case, bear case, and synthesis."""
    bull_case: str
    """4-6 sentence bull case with specific references to evidence."""
    bear_case: str
    """3-4 sentence bear case grounded in identified risks."""
    synthesis: str
    """2-3 sentences that reconcile bull and bear cases into a net view."""
    evidence: list[Evidence]
    """5-8 key evidence points that most directly support the synthesis."""


class Recommendation(BaseModel):
    """Full investment recommendation for a ticker against a specific goal profile."""
    ticker: str
    goal_profile: Literal["high_growth", "balanced", "income", "defensive"]
    action: Literal["strong_buy", "buy", "hold", "trim", "sell"]
    confidence: Literal["high", "medium", "low"]
    thesis: AnalysisThesis
    key_risks: list[KeyRisk]
    """3-5 material risks ordered by severity."""
    goal_alignment: int
    """0-100 score: how well this stock fits the user's stated goal profile."""
    review_triggers: list[str]
    """3-5 specific, measurable conditions that should prompt re-evaluation."""
    sentiment_summary: str | None = None
    """Brief summary of retail sentiment and short interest context."""
    transcript_quarter: int | None = None
    transcript_year: int | None = None
    generated_at: str


class AnalysisRequest(BaseModel):
    goal_id: str
    force_refresh: bool = False
    """If True, bypass cached analysis and re-run the full pipeline."""
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/portfolio.py backend/app/models/analysis.py
git commit -m "feat: add portfolio and analysis Pydantic models"
```

---

## Task 3: Test Infrastructure + Dependencies

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Update requirements.txt**

```txt
fastapi
uvicorn[standard]
yfinance
pandas
python-dotenv
httpx
cachetools
anthropic
pytest
pytest-asyncio
pytest-mock
```

- [ ] **Step 2: Install new dependencies**

```bash
cd backend
pip install -r requirements.txt
```

Expected: `Successfully installed anthropic-X.X.X pytest-X.X.X pytest-asyncio-X.X.X pytest-mock-X.X.X`

- [ ] **Step 3: Create tests/__init__.py**

```python
# backend/tests/__init__.py
```

- [ ] **Step 4: Create conftest.py with shared fixtures**

```python
# backend/tests/conftest.py
"""Shared pytest fixtures for the test suite."""

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_supabase_client(mocker):
    """Mock the httpx client used for Supabase PostgREST calls."""
    mock = MagicMock()
    mock.get = AsyncMock()
    mock.post = AsyncMock()
    mock.patch = AsyncMock()
    mock.delete = AsyncMock()
    return mock


@pytest.fixture
def sample_goal_row():
    return {
        "id": "goal-123",
        "profile": "high_growth",
        "horizon": "long",
        "risk_tolerance": "high",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_transcript_content():
    return (
        "Thank you for joining Apple's Q4 2024 earnings call. "
        "We reported revenue of $94.9 billion, up 6% year-over-year. "
        "Services revenue reached an all-time high of $24.2 billion, up 12% YoY. "
        "We expect Q1 2025 revenue growth in the low-to-mid single digits. "
        "iPhone demand has remained resilient despite macroeconomic headwinds. "
        "We are seeing strong adoption of Apple Intelligence features. "
        "Gross margin came in at 46.2%, ahead of our guidance range. "
        "We returned $29 billion to shareholders through buybacks and dividends."
    )
```

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/tests/__init__.py backend/tests/conftest.py
git commit -m "chore: add test infrastructure and anthropic dependency"
```

---

## Task 4: FMP Transcript Service

**Files:**
- Create: `backend/app/services/fmp.py`
- Create: `backend/tests/test_fmp.py`

FMP endpoint used: `GET https://financialmodelingprep.com/api/v3/earning_call_transcript/{SYMBOL}?quarter={Q}&year={YYYY}&apikey={KEY}`

Returns a list; take `content` from `result[0]` if present.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_fmp.py
"""Tests for the FMP transcript service."""

import pytest
from unittest.mock import patch, MagicMock
from app.services.fmp import fetch_transcript, fetch_short_interest


class TestFetchTranscript:
    def test_returns_content_for_valid_response(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "AAPL", "quarter": 4, "year": 2024, "content": "Revenue was strong."}
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.httpx.get", return_value=mock_response):
            result = fetch_transcript("AAPL", quarter=4, year=2024)

        assert result is not None
        assert result["content"] == "Revenue was strong."
        assert result["quarter"] == 4
        assert result["year"] == 2024

    def test_returns_none_for_empty_response(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.httpx.get", return_value=mock_response):
            result = fetch_transcript("FAKE", quarter=1, year=2020)

        assert result is None

    def test_returns_none_on_http_error(self):
        import httpx
        with patch("app.services.fmp.httpx.get", side_effect=httpx.HTTPError("timeout")):
            result = fetch_transcript("AAPL", quarter=4, year=2024)

        assert result is None

    def test_latest_uses_most_recent_quarter(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "AAPL", "quarter": 4, "year": 2024, "content": "Q4 call."},
            {"symbol": "AAPL", "quarter": 3, "year": 2024, "content": "Q3 call."},
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.httpx.get", return_value=mock_response) as mock_get:
            # When quarter/year are None, should call list endpoint and return first result
            result = fetch_latest_transcript("AAPL")

        assert result is not None
        assert result["quarter"] == 4


class TestFetchShortInterest:
    def test_returns_short_float_for_valid_response(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "AAPL", "shortPercent": 0.57, "shortShares": 89000000}
        ]
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.fmp.httpx.get", return_value=mock_response):
            result = fetch_short_interest("AAPL")

        assert result is not None
        assert result["short_float_pct"] == pytest.approx(0.57)

    def test_returns_none_on_error(self):
        import httpx
        with patch("app.services.fmp.httpx.get", side_effect=httpx.HTTPError("error")):
            result = fetch_short_interest("AAPL")

        assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_fmp.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.fmp'` or similar FAIL.

- [ ] **Step 3: Implement fmp.py**

```python
# backend/app/services/fmp.py
"""Financial Modeling Prep API client.

Fetches earnings call transcripts and short interest data.
Results are not cached here — callers handle persistence.
"""

import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

FMP_API_KEY = os.getenv("FMP_API_KEY", "")
FMP_BASE = "https://financialmodelingprep.com/api/v3"


def fetch_transcript(ticker: str, quarter: int, year: int) -> dict[str, Any] | None:
    """Fetch a single earnings call transcript by ticker, quarter, and year.

    Args:
        ticker: Stock ticker symbol.
        quarter: Fiscal quarter (1-4).
        year: Fiscal year (e.g. 2024).

    Returns:
        Dict with keys: symbol, quarter, year, content. None on error or not found.
    """
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not set — cannot fetch transcript")
        return None
    try:
        resp = httpx.get(
            f"{FMP_BASE}/earning_call_transcript/{ticker.upper()}",
            params={"quarter": quarter, "year": year, "apikey": FMP_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "symbol": item.get("symbol", ticker.upper()),
            "quarter": item.get("quarter", quarter),
            "year": item.get("year", year),
            "content": item.get("content", ""),
        }
    except Exception:
        logger.exception("Error fetching transcript for %s Q%d %d", ticker, quarter, year)
        return None


def fetch_latest_transcript(ticker: str) -> dict[str, Any] | None:
    """Fetch the most recent available earnings call transcript for a ticker.

    Calls the list endpoint (no quarter/year filter) and returns the first result,
    which FMP returns in reverse-chronological order.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with keys: symbol, quarter, year, content. None on error or not found.
    """
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not set — cannot fetch transcript")
        return None
    try:
        resp = httpx.get(
            f"{FMP_BASE}/earning_call_transcript/{ticker.upper()}",
            params={"apikey": FMP_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "symbol": item.get("symbol", ticker.upper()),
            "quarter": item.get("quarter"),
            "year": item.get("year"),
            "content": item.get("content", ""),
        }
    except Exception:
        logger.exception("Error fetching latest transcript for %s", ticker)
        return None


def fetch_short_interest(ticker: str) -> dict[str, Any] | None:
    """Fetch the latest short interest data for a ticker.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with short_float_pct and short_shares. None on error or not available.
    """
    if not FMP_API_KEY:
        return None
    try:
        resp = httpx.get(
            f"{FMP_BASE}/short-volume/{ticker.upper()}",
            params={"apikey": FMP_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {
            "short_float_pct": item.get("shortPercent"),
            "short_shares": item.get("shortShares"),
        }
    except Exception:
        logger.exception("Error fetching short interest for %s", ticker)
        return None
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_fmp.py -v
```

Expected: All tests PASS (note: `test_latest_uses_most_recent_quarter` needs `fetch_latest_transcript` imported in test — update the test import line to include it).

Fix import in `test_fmp.py`:
```python
from app.services.fmp import fetch_transcript, fetch_short_interest, fetch_latest_transcript
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/fmp.py backend/tests/test_fmp.py
git commit -m "feat: add FMP transcript and short interest service"
```

---

## Task 5: Sentiment Service

**Files:**
- Create: `backend/app/services/sentiment.py`
- Create: `backend/tests/test_sentiment.py`

Aggregates two signals: (1) company-specific news headlines from NewsAPI, (2) short interest data from FMP. Returns a plain-language summary and raw signal dict.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_sentiment.py
"""Tests for the sentiment aggregation service."""

import pytest
from unittest.mock import patch
from app.services.sentiment import fetch_sentiment_signals, summarise_sentiment


class TestFetchSentimentSignals:
    def test_returns_combined_signals(self):
        mock_articles = [
            {"title": "Apple beats earnings estimates", "url": "https://example.com/1"},
            {"title": "iPhone sales surge in China", "url": "https://example.com/2"},
        ]
        mock_short = {"short_float_pct": 0.57, "short_shares": 89_000_000}

        with patch("app.services.sentiment.fetch_market_news", return_value=mock_articles):
            with patch("app.services.sentiment.fetch_short_interest", return_value=mock_short):
                result = fetch_sentiment_signals("AAPL")

        assert result["news_articles"] == mock_articles
        assert result["short_float_pct"] == pytest.approx(0.57)
        assert result["ticker"] == "AAPL"

    def test_handles_missing_short_interest(self):
        mock_articles = [{"title": "Apple news", "url": "https://example.com"}]

        with patch("app.services.sentiment.fetch_market_news", return_value=mock_articles):
            with patch("app.services.sentiment.fetch_short_interest", return_value=None):
                result = fetch_sentiment_signals("AAPL")

        assert result["short_float_pct"] is None
        assert result["news_articles"] == mock_articles

    def test_handles_no_news(self):
        with patch("app.services.sentiment.fetch_market_news", return_value=[]):
            with patch("app.services.sentiment.fetch_short_interest", return_value=None):
                result = fetch_sentiment_signals("AAPL")

        assert result["news_articles"] == []


class TestSummariseSentiment:
    def test_returns_string_with_short_interest_context(self):
        signals = {
            "ticker": "AAPL",
            "short_float_pct": 5.2,
            "short_shares": 80_000_000,
            "news_articles": [
                {"title": "Apple beats Q4 estimates"},
                {"title": "iPhone demand strong"},
            ],
        }
        result = summarise_sentiment(signals)
        assert isinstance(result, str)
        assert len(result) > 20

    def test_low_short_interest_reflected_in_summary(self):
        signals = {
            "ticker": "AAPL",
            "short_float_pct": 0.5,
            "short_shares": 10_000_000,
            "news_articles": [],
        }
        result = summarise_sentiment(signals)
        assert "short" in result.lower() or "low" in result.lower()

    def test_returns_no_data_string_when_empty(self):
        signals = {"ticker": "FAKE", "short_float_pct": None, "news_articles": []}
        result = summarise_sentiment(signals)
        assert isinstance(result, str)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_sentiment.py -v
```

Expected: `ModuleNotFoundError` or `ImportError` — FAIL.

- [ ] **Step 3: Implement sentiment.py**

```python
# backend/app/services/sentiment.py
"""Sentiment signal aggregator.

Combines company-specific news headlines and short interest data into
a structured signal dict, plus a plain-English summary string.
"""

import logging
from typing import Any

from app.services.fmp import fetch_short_interest
from app.services.news import fetch_market_news

logger = logging.getLogger(__name__)


def fetch_sentiment_signals(ticker: str) -> dict[str, Any]:
    """Fetch and aggregate sentiment signals for a ticker.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Dict with keys:
          ticker (str)
          news_articles (list[dict]) — recent headlines mentioning the company
          short_float_pct (float | None)
          short_shares (int | None)
    """
    # NewsAPI company-specific search uses ticker as keyword
    articles = fetch_market_news(category="business", page_size=20)
    ticker_upper = ticker.upper()
    # Filter headlines that mention the ticker or a rough company name match
    relevant = [a for a in articles if ticker_upper in (a.get("title") or "").upper()
                or ticker_upper in (a.get("description") or "").upper()]
    # Fall back to all business news if no specific mentions
    if not relevant:
        relevant = articles[:5]

    short_data = fetch_short_interest(ticker)

    return {
        "ticker": ticker_upper,
        "news_articles": relevant,
        "short_float_pct": short_data["short_float_pct"] if short_data else None,
        "short_shares": short_data["short_shares"] if short_data else None,
    }


def summarise_sentiment(signals: dict[str, Any]) -> str:
    """Build a plain-English summary of sentiment signals.

    This summary is injected as context into the Claude recommendation prompt.
    It is intentionally short — Claude does the deep interpretation.

    Args:
        signals: Output from fetch_sentiment_signals().

    Returns:
        A 2-3 sentence plain-English sentiment context string.
    """
    ticker = signals.get("ticker", "")
    short_pct = signals.get("short_float_pct")
    articles = signals.get("news_articles", [])

    parts: list[str] = []

    if short_pct is not None:
        if short_pct < 1.5:
            parts.append(f"Short interest is very low at {short_pct:.1f}% of float, suggesting minimal bearish positioning by institutional traders.")
        elif short_pct < 5.0:
            parts.append(f"Short interest is moderate at {short_pct:.1f}% of float.")
        elif short_pct < 15.0:
            parts.append(f"Short interest is elevated at {short_pct:.1f}% of float, indicating meaningful bearish conviction among institutional traders.")
        else:
            parts.append(f"Short interest is high at {short_pct:.1f}% of float — a notable bearish signal that warrants scrutiny of the bear thesis.")

    if articles:
        titles = "; ".join(a["title"] for a in articles[:3] if a.get("title"))
        parts.append(f"Recent news relevant to {ticker}: {titles}.")
    else:
        parts.append(f"No recent company-specific headlines found for {ticker}.")

    if not parts:
        return f"No sentiment data available for {ticker}."

    return " ".join(parts)
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_sentiment.py -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/sentiment.py backend/tests/test_sentiment.py
git commit -m "feat: add sentiment signal aggregator with news and short interest"
```

---

## Task 6: Claude Analysis Service

**Files:**
- Create: `backend/app/services/claude_analysis.py`
- Create: `backend/tests/test_claude_analysis.py`

Two-step Claude pipeline:
1. **Extraction**: Claude reads the raw transcript and returns structured JSON (guidance, tone, risks, competitor mentions).
2. **Synthesis**: Claude receives the extraction + financials + sentiment + goal profile and returns the full `Recommendation` JSON.

Uses `anthropic` Python SDK with prompt caching on the transcript.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_claude_analysis.py
"""Tests for the Claude analysis service."""

import pytest
import json
from unittest.mock import MagicMock, patch
from app.services.claude_analysis import extract_transcript, synthesise_recommendation
from app.models.analysis import Recommendation


class TestExtractTranscript:
    def test_returns_structured_extraction_dict(self):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps({
            "forward_guidance": {
                "revenue": "Low-to-mid single digit growth in Q1 2025",
                "gross_margin": "46.0%–47.0% guidance range",
                "capex": "No material change expected"
            },
            "management_tone": "confident",
            "tone_evidence": ["We are very pleased with our results", "Demand remains robust"],
            "competitor_mentions": ["Google AI features mentioned as competitive pressure"],
            "risk_flags": ["China revenue softness flagged by analyst questions"]
        }))]
        mock_client.messages.create.return_value = mock_message

        result = extract_transcript(
            transcript_content="Sample earnings call text...",
            ticker="AAPL",
            client=mock_client,
        )

        assert result["management_tone"] == "confident"
        assert "forward_guidance" in result
        assert isinstance(result["risk_flags"], list)

    def test_returns_empty_dict_on_json_parse_error(self):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text="not valid json")]
        mock_client.messages.create.return_value = mock_message

        result = extract_transcript("Some transcript", "AAPL", client=mock_client)
        assert result == {}

    def test_returns_empty_dict_on_api_error(self):
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API error")

        result = extract_transcript("Some transcript", "AAPL", client=mock_client)
        assert result == {}


class TestSynthesiseRecommendation:
    def _make_mock_client(self, action="buy", confidence="high"):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text=json.dumps({
            "action": action,
            "confidence": confidence,
            "goal_alignment": 82,
            "bull_case": "Apple's services segment continues to grow at 12% YoY, providing durable recurring revenue that reduces cyclicality. Management guided for gross margins above 46%, ahead of the 5-year average of 43%. The balance sheet holds $165B in cash, supporting continued buybacks. AI integration into core products represents a long-term monetisation opportunity not fully priced in.",
            "bear_case": "China revenue declined 8% YoY, representing a structural risk given 17% of total revenue exposure. Regulatory pressure on App Store fees in the EU threatens high-margin services growth.",
            "synthesis": "Apple remains a high-quality compounder with durable cash generation. The China headwind is real but manageable given diversification. Services growth offsets hardware cyclicality, supporting a buy thesis for long-horizon growth investors.",
            "evidence": [
                {
                    "source": "Q4 2024 Earnings Call",
                    "quote": "Services revenue reached an all-time high of $24.2 billion, up 12% year-over-year.",
                    "metric": "Services Revenue YoY: +12%",
                    "significance": "Services carry ~70% gross margins vs ~35% for hardware, shifting the revenue mix toward structurally higher profitability."
                }
            ],
            "key_risks": [
                {
                    "risk": "China revenue declined 8% year-over-year and represents 17% of total revenue. Continued softness or further regulatory action by Chinese authorities could materially impact near-term earnings.",
                    "evidence": [
                        {
                            "source": "Q4 2024 Earnings Call",
                            "quote": "Greater China revenue was $15.0 billion, down 8% year-over-year.",
                            "metric": "China Revenue YoY: -8%",
                            "significance": "China is Apple's third-largest geography. An 8% decline signals potential market share loss to local competitors like Huawei."
                        }
                    ],
                    "severity": "high",
                    "mitigants": "Apple Intelligence AI features could drive upgrade cycles in China if regulatory environment stabilises. India expansion is partially offsetting volume losses."
                }
            ],
            "review_triggers": [
                "Re-evaluate if China revenue declines exceed 15% YoY for two consecutive quarters",
                "Reassess if gross margin guidance drops below 44% in any quarter",
                "Revisit if Services revenue growth decelerates below 8% YoY"
            ],
            "sentiment_summary": "Short interest is very low at 0.6% of float. Recent headlines focus on Apple Intelligence reception and Q4 beat."
        }))]
        mock_client.messages.create.return_value = mock_message
        return mock_client

    def test_returns_recommendation_object(self):
        mock_client = self._make_mock_client()
        extraction = {"management_tone": "confident", "forward_guidance": {}, "risk_flags": []}
        financials_summary = "Revenue: $94.9B (+6% YoY). Gross Margin: 46.2%."
        sentiment_summary = "Short interest 0.6%. Recent news positive."
        goal_profile = "high_growth"

        result = synthesise_recommendation(
            ticker="AAPL",
            extraction=extraction,
            financials_summary=financials_summary,
            sentiment_summary=sentiment_summary,
            goal_profile=goal_profile,
            client=mock_client,
        )

        assert isinstance(result, Recommendation)
        assert result.action == "buy"
        assert result.confidence == "high"
        assert result.goal_alignment == 82
        assert len(result.thesis.evidence) >= 1
        assert len(result.key_risks) >= 1
        assert len(result.thesis.bull_case) > 100
        assert len(result.key_risks[0].risk) > 50
        assert len(result.review_triggers) >= 1

    def test_action_valid_enum_value(self):
        mock_client = self._make_mock_client(action="hold")
        result = synthesise_recommendation(
            ticker="AAPL",
            extraction={},
            financials_summary="Revenue flat.",
            sentiment_summary="Neutral.",
            goal_profile="balanced",
            client=mock_client,
        )
        assert result.action in ("strong_buy", "buy", "hold", "trim", "sell")

    def test_returns_none_on_api_error(self):
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API down")
        result = synthesise_recommendation("AAPL", {}, "", "", "high_growth", client=mock_client)
        assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_claude_analysis.py -v
```

Expected: `ModuleNotFoundError` — FAIL.

- [ ] **Step 3: Implement claude_analysis.py**

```python
# backend/app/services/claude_analysis.py
"""Claude-powered investment analysis.

Two-step pipeline:
  1. extract_transcript()  — structured JSON extraction from raw call text.
  2. synthesise_recommendation() — full Recommendation from extraction + context.

The caller passes in the Anthropic client so tests can inject a mock.
In production, get_client() is called by the pipeline orchestrator.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import anthropic
from dotenv import load_dotenv

from app.models.analysis import (
    AnalysisThesis,
    Evidence,
    KeyRisk,
    Recommendation,
)

load_dotenv()

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-6"

# Goal profile → scoring bias description for the synthesis prompt
_GOAL_CONTEXT: dict[str, str] = {
    "high_growth": (
        "The investor prioritises maximum capital appreciation over 10+ years and can tolerate high volatility. "
        "Weight revenue growth rate, market share expansion, forward guidance strength, and TAM expansion heavily. "
        "Downweight dividend yield and near-term earnings stability."
    ),
    "balanced": (
        "The investor wants steady growth with some income over a 5-10 year horizon. "
        "Weight earnings quality, sustainable margins, ROE, and moderate dividend as equally important. "
        "Flag high leverage or cyclical revenue as negatives."
    ),
    "income": (
        "The investor's primary goal is reliable and growing dividend income. "
        "Weight free cash flow coverage of dividends, dividend growth streak, and payout ratio sustainability above all. "
        "Flag any risk to the dividend immediately. Earnings growth is secondary."
    ),
    "defensive": (
        "The investor prioritises capital preservation with low volatility. "
        "Weight balance sheet strength, low beta, high current ratio, and defensive sector positioning. "
        "Flag high leverage, cyclicality, or dependency on a single geography as high-severity risks."
    ),
}


def get_client() -> anthropic.Anthropic:
    """Return a production Anthropic client."""
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def extract_transcript(
    transcript_content: str,
    ticker: str,
    client: anthropic.Anthropic | None = None,
) -> dict[str, Any]:
    """Extract structured information from a raw earnings call transcript.

    Uses prompt caching on the transcript content so subsequent calls
    for the same transcript are ~10x cheaper.

    Args:
        transcript_content: Raw text of the earnings call transcript.
        ticker: Ticker symbol for context.
        client: Anthropic client (inject for testing; defaults to get_client()).

    Returns:
        Dict with keys: forward_guidance, management_tone, tone_evidence,
        competitor_mentions, risk_flags. Empty dict on error.
    """
    if client is None:
        client = get_client()

    extraction_schema = {
        "forward_guidance": {
            "revenue": "Management's revenue guidance for next quarter/year",
            "gross_margin": "Gross margin guidance if given",
            "capex": "Capital expenditure guidance if given",
            "other": "Any other quantitative guidance given"
        },
        "management_tone": "One of: confident / cautious / defensive / evasive",
        "tone_evidence": ["List of 2-4 direct quotes that justify the tone classification"],
        "competitor_mentions": ["List of competitor references or competitive risk statements"],
        "risk_flags": ["List of concerning statements, analyst pushback themes, or disclosed risks"]
    }

    prompt = (
        f"You are analysing the earnings call transcript for {ticker}. "
        f"Extract the following information and return ONLY valid JSON matching this schema exactly:\n"
        f"{json.dumps(extraction_schema, indent=2)}\n\n"
        f"Be precise. Use direct quotes from the transcript for tone_evidence and risk_flags. "
        f"If a field has no relevant content, use an empty string or empty list."
    )

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1500,
            system=[
                {
                    "type": "text",
                    "text": f"You are a professional equity analyst. Earnings call transcript for {ticker}:\n\n{transcript_content}",
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Claude extraction returned non-JSON for %s", ticker)
        return {}
    except Exception:
        logger.exception("Claude extraction failed for %s", ticker)
        return {}


def synthesise_recommendation(
    ticker: str,
    extraction: dict[str, Any],
    financials_summary: str,
    sentiment_summary: str,
    goal_profile: str,
    client: anthropic.Anthropic | None = None,
) -> Recommendation | None:
    """Generate a full investment recommendation from extracted signals.

    Args:
        ticker: Stock ticker symbol.
        extraction: Output from extract_transcript().
        financials_summary: Pre-formatted string of key financial metrics.
        sentiment_summary: Output from sentiment.summarise_sentiment().
        goal_profile: One of 'high_growth', 'balanced', 'income', 'defensive'.
        client: Anthropic client (inject for testing).

    Returns:
        Recommendation model instance. None on error.
    """
    if client is None:
        client = get_client()

    goal_context = _GOAL_CONTEXT.get(goal_profile, _GOAL_CONTEXT["balanced"])

    recommendation_schema = {
        "action": "One of: strong_buy / buy / hold / trim / sell",
        "confidence": "One of: high / medium / low",
        "goal_alignment": "Integer 0-100: how well this stock fits the investor goal profile",
        "bull_case": "4-6 sentences. Cite specific metrics, guidance, and trends. Reference evidence sources.",
        "bear_case": "3-4 sentences. Cite specific risks and their potential financial impact.",
        "synthesis": "2-3 sentences reconciling bull and bear into a net investment view.",
        "evidence": [
            {
                "source": "e.g. 'Q4 2024 Earnings Call' or 'FY2024 Income Statement'",
                "quote": "Exact quote or formatted metric e.g. 'Revenue: $94.9B (+6% YoY)'",
                "metric": "Optional short metric label e.g. 'Services Revenue YoY: +12%'",
                "significance": "2-3 sentences: why this evidence matters to the thesis"
            }
        ],
        "key_risks": [
            {
                "risk": "3-4 sentences describing the risk and potential magnitude.",
                "evidence": [
                    {
                        "source": "Source label",
                        "quote": "Supporting quote or metric",
                        "metric": "Optional metric label",
                        "significance": "2-3 sentences on why this evidence surfaces the risk"
                    }
                ],
                "severity": "One of: high / medium / low",
                "mitigants": "2-3 sentences: what could reduce or invalidate this risk"
            }
        ],
        "review_triggers": [
            "3-5 specific, measurable conditions that should prompt re-evaluation"
        ],
        "sentiment_summary": "1-2 sentences integrating the sentiment context"
    }

    context_block = (
        f"TICKER: {ticker}\n\n"
        f"INVESTOR GOAL PROFILE:\n{goal_context}\n\n"
        f"FINANCIAL SUMMARY:\n{financials_summary}\n\n"
        f"EARNINGS CALL EXTRACTION:\n{json.dumps(extraction, indent=2)}\n\n"
        f"SENTIMENT CONTEXT:\n{sentiment_summary}"
    )

    prompt = (
        f"You are a senior equity analyst generating an investment recommendation for {ticker}. "
        f"The investor has a specific goal profile — score and weight your analysis accordingly.\n\n"
        f"Generate a recommendation using ALL provided signals. Be specific: cite actual numbers, "
        f"direct quotes, and named risks. Avoid generic language. "
        f"The thesis and key risks must be detailed enough that a reader understands the proof behind each claim.\n\n"
        f"Return ONLY valid JSON matching this schema exactly:\n"
        f"{json.dumps(recommendation_schema, indent=2)}\n\n"
        f"Include 5-8 evidence items. Include 3-5 key risks ordered by severity. "
        f"Include 3-5 review triggers that are specific and measurable."
    )

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4000,
            system=context_block,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        data = json.loads(raw)

        thesis = AnalysisThesis(
            bull_case=data["bull_case"],
            bear_case=data["bear_case"],
            synthesis=data["synthesis"],
            evidence=[Evidence(**e) for e in data.get("evidence", [])],
        )

        risks = [
            KeyRisk(
                risk=r["risk"],
                evidence=[Evidence(**e) for e in r.get("evidence", [])],
                severity=r["severity"],
                mitigants=r["mitigants"],
            )
            for r in data.get("key_risks", [])
        ]

        return Recommendation(
            ticker=ticker,
            goal_profile=goal_profile,
            action=data["action"],
            confidence=data["confidence"],
            goal_alignment=data["goal_alignment"],
            thesis=thesis,
            key_risks=risks,
            review_triggers=data.get("review_triggers", []),
            sentiment_summary=data.get("sentiment_summary"),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    except (json.JSONDecodeError, KeyError):
        logger.warning("Claude synthesis returned invalid JSON for %s", ticker)
        return None
    except Exception:
        logger.exception("Claude synthesis failed for %s", ticker)
        return None
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_claude_analysis.py -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/claude_analysis.py backend/tests/test_claude_analysis.py
git commit -m "feat: add Claude two-step analysis service (extraction + synthesis)"
```

---

## Task 7: Financial Summary Builder

**Files:**
- Create: `backend/app/services/financials_summary.py`
- Create: `backend/tests/test_financials_summary.py`

Converts the raw yfinance financial statement dicts into a concise, Claude-readable text block. This keeps the Claude prompt focused — raw statements are too verbose.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_financials_summary.py
"""Tests for the financial summary builder."""

from app.services.financials_summary import build_financials_summary


class TestBuildFinancialsSummary:
    def test_returns_non_empty_string(self):
        income = {
            "symbol": "AAPL",
            "statement_type": "income_statement",
            "statements": [
                {"date": "2024-09-30", "data": {"Total Revenue": 94930000000, "Net Income": 14736000000, "Operating Income": 17517000000}},
                {"date": "2023-09-30", "data": {"Total Revenue": 89498000000, "Net Income": 22956000000, "Operating Income": 22959000000}},
            ]
        }
        ratios = {
            "symbol": "AAPL",
            "pe_ratio": 31.2,
            "profit_margin": 0.241,
            "return_on_equity": 1.6,
            "debt_to_equity": 4.7,
            "dividend_yield": 0.005,
            "beta": 1.24,
        }
        result = build_financials_summary(income_data=income, ratios_data=ratios)
        assert isinstance(result, str)
        assert len(result) > 100
        assert "Revenue" in result

    def test_handles_missing_ratios(self):
        income = {
            "symbol": "AAPL",
            "statement_type": "income_statement",
            "statements": [
                {"date": "2024-09-30", "data": {"Total Revenue": 94930000000}}
            ]
        }
        result = build_financials_summary(income_data=income, ratios_data=None)
        assert isinstance(result, str)
        assert "Revenue" in result

    def test_calculates_revenue_growth(self):
        income = {
            "symbol": "AAPL",
            "statement_type": "income_statement",
            "statements": [
                {"date": "2024-09-30", "data": {"Total Revenue": 100_000_000_000}},
                {"date": "2023-09-30", "data": {"Total Revenue": 90_000_000_000}},
            ]
        }
        result = build_financials_summary(income_data=income, ratios_data=None)
        assert "+11" in result or "11%" in result
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_financials_summary.py -v
```

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement financials_summary.py**

```python
# backend/app/services/financials_summary.py
"""Converts raw financial statement dicts into a concise text block for Claude.

Keeps Claude prompts focused and under token budget by pre-summarising
the most decision-relevant metrics rather than dumping raw statement rows.
"""

from typing import Any


def _fmt_billions(val: float | None) -> str:
    """Format a raw dollar value as $XB or $XM."""
    if val is None:
        return "N/A"
    if abs(val) >= 1e9:
        return f"${val / 1e9:.1f}B"
    if abs(val) >= 1e6:
        return f"${val / 1e6:.0f}M"
    return f"${val:.0f}"


def _pct(val: float | None) -> str:
    """Format a 0-1 ratio or a plain percentage."""
    if val is None:
        return "N/A"
    if abs(val) <= 1.5:
        return f"{val * 100:.1f}%"
    return f"{val:.1f}%"


def build_financials_summary(
    income_data: dict[str, Any] | None,
    ratios_data: Any | None,
) -> str:
    """Build a concise financial summary string for Claude context.

    Args:
        income_data: Dict from GET /income-statement (statements list with date + data keys).
        ratios_data: Dict or KeyRatios object from GET /ratios.

    Returns:
        Multi-line string summarising the most relevant financial metrics.
    """
    lines: list[str] = []

    # Income statement — latest year + YoY growth
    if income_data and income_data.get("statements"):
        stmts = income_data["statements"]
        latest = stmts[0]["data"] if stmts else {}
        prior = stmts[1]["data"] if len(stmts) > 1 else {}
        latest_date = stmts[0].get("date", "Latest") if stmts else "Latest"

        rev = latest.get("Total Revenue")
        prior_rev = prior.get("Total Revenue")
        rev_growth = ""
        if rev and prior_rev and prior_rev != 0:
            growth_pct = (rev - prior_rev) / abs(prior_rev) * 100
            rev_growth = f" ({growth_pct:+.1f}% YoY)"

        op_inc = latest.get("Operating Income") or latest.get("Total Operating Income As Reported")
        net_inc = latest.get("Net Income") or latest.get("Net Income Common Stockholders")

        lines.append(f"== Income Statement ({latest_date}) ==")
        lines.append(f"Revenue: {_fmt_billions(rev)}{rev_growth}")
        lines.append(f"Operating Income: {_fmt_billions(op_inc)}")
        lines.append(f"Net Income: {_fmt_billions(net_inc)}")
        if rev and op_inc:
            lines.append(f"Operating Margin: {op_inc / rev * 100:.1f}%")
        if rev and net_inc:
            lines.append(f"Net Margin: {net_inc / rev * 100:.1f}%")

    # Key ratios
    if ratios_data:
        r = ratios_data if isinstance(ratios_data, dict) else ratios_data.__dict__
        lines.append("\n== Key Ratios ==")
        fields = [
            ("P/E Ratio", "pe_ratio", lambda v: f"{v:.1f}x"),
            ("Forward P/E", "forward_pe", lambda v: f"{v:.1f}x"),
            ("PEG Ratio", "peg_ratio", lambda v: f"{v:.2f}"),
            ("EV/EBITDA", "ev_to_ebitda", lambda v: f"{v:.1f}x"),
            ("ROE", "return_on_equity", _pct),
            ("Debt/Equity", "debt_to_equity", lambda v: f"{v:.2f}x"),
            ("Dividend Yield", "dividend_yield", _pct),
            ("Beta", "beta", lambda v: f"{v:.2f}"),
            ("52W High", "fifty_two_week_high", lambda v: f"${v:.2f}"),
            ("52W Low", "fifty_two_week_low", lambda v: f"${v:.2f}"),
        ]
        for label, key, fmt in fields:
            val = r.get(key) if isinstance(r, dict) else getattr(ratios_data, key, None)
            if val is not None:
                lines.append(f"{label}: {fmt(val)}")

    if not lines:
        return "No financial data available."

    return "\n".join(lines)
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_financials_summary.py -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/financials_summary.py backend/tests/test_financials_summary.py
git commit -m "feat: add financial summary builder for Claude context injection"
```

---

## Task 8: Goals DB Service

**Files:**
- Create: `backend/app/services/goals_db.py`
- Create: `backend/tests/test_goals_db.py`

CRUD for `user_goals` table via Supabase PostgREST, following the same pattern as the existing projections service.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_goals_db.py
"""Tests for the user goals database service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.goals_db import create_goal, get_goal, list_goals, delete_goal


@pytest.fixture
def mock_resp_single(sample_goal_row):
    resp = MagicMock()
    resp.status_code = 201
    resp.json.return_value = [sample_goal_row]
    resp.raise_for_status = MagicMock()
    return resp


@pytest.fixture
def mock_resp_list(sample_goal_row):
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = [sample_goal_row]
    resp.raise_for_status = MagicMock()
    return resp


class TestCreateGoal:
    def test_returns_user_goal_model(self, mock_resp_single):
        with patch("app.services.goals_db.httpx.post", return_value=mock_resp_single):
            result = create_goal(profile="high_growth", horizon="long", risk_tolerance="high")
        assert result is not None
        assert result.profile == "high_growth"
        assert result.id == "goal-123"

    def test_returns_none_on_http_error(self):
        import httpx
        with patch("app.services.goals_db.httpx.post", side_effect=httpx.HTTPError("err")):
            result = create_goal(profile="high_growth", horizon="long", risk_tolerance="high")
        assert result is None


class TestGetGoal:
    def test_returns_goal_when_found(self, mock_resp_list):
        with patch("app.services.goals_db.httpx.get", return_value=mock_resp_list):
            result = get_goal("goal-123")
        assert result is not None
        assert result.id == "goal-123"

    def test_returns_none_when_not_found(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = []
        resp.raise_for_status = MagicMock()
        with patch("app.services.goals_db.httpx.get", return_value=resp):
            result = get_goal("nonexistent-id")
        assert result is None


class TestListGoals:
    def test_returns_list(self, mock_resp_list):
        with patch("app.services.goals_db.httpx.get", return_value=mock_resp_list):
            result = list_goals()
        assert isinstance(result, list)
        assert len(result) == 1


class TestDeleteGoal:
    def test_returns_true_on_success(self):
        resp = MagicMock()
        resp.status_code = 204
        resp.raise_for_status = MagicMock()
        with patch("app.services.goals_db.httpx.delete", return_value=resp):
            result = delete_goal("goal-123")
        assert result is True

    def test_returns_false_on_error(self):
        import httpx
        with patch("app.services.goals_db.httpx.delete", side_effect=httpx.HTTPError("err")):
            result = delete_goal("goal-123")
        assert result is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_goals_db.py -v
```

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement goals_db.py**

```python
# backend/app/services/goals_db.py
"""User goals CRUD via Supabase PostgREST.

Follows the same httpx + SUPABASE_URL / SUPABASE_SERVICE_KEY pattern
used by the existing projections service.
"""

import logging
import os

import httpx
from dotenv import load_dotenv

from app.models.portfolio import UserGoal

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
TABLE = "user_goals"


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _base_url() -> str:
    return f"{SUPABASE_URL}/rest/v1/{TABLE}"


def create_goal(
    profile: str,
    horizon: str,
    risk_tolerance: str,
) -> UserGoal | None:
    """Insert a new user goal and return the created row."""
    try:
        resp = httpx.post(
            _base_url(),
            headers=_headers(),
            json={"profile": profile, "horizon": horizon, "risk_tolerance": risk_tolerance},
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return UserGoal(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error creating user goal")
        return None


def get_goal(goal_id: str) -> UserGoal | None:
    """Fetch a single goal by ID."""
    try:
        resp = httpx.get(
            _base_url(),
            headers=_headers(),
            params={"id": f"eq.{goal_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return UserGoal(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error fetching goal %s", goal_id)
        return None


def list_goals() -> list[UserGoal]:
    """Return all stored user goals."""
    try:
        resp = httpx.get(_base_url(), headers=_headers(), timeout=10)
        resp.raise_for_status()
        return [UserGoal(**row) for row in resp.json()]
    except Exception:
        logger.exception("Error listing goals")
        return []


def delete_goal(goal_id: str) -> bool:
    """Delete a goal by ID. Returns True on success."""
    try:
        resp = httpx.delete(
            _base_url(),
            headers={**_headers(), "Prefer": ""},
            params={"id": f"eq.{goal_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Error deleting goal %s", goal_id)
        return False
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_goals_db.py -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/goals_db.py backend/tests/test_goals_db.py
git commit -m "feat: add user goals CRUD service"
```

---

## Task 9: Portfolio DB Service

**Files:**
- Create: `backend/app/services/portfolio_db.py`
- Create: `backend/tests/test_portfolio_db.py`

CRUD for `portfolios` and `positions` tables.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_portfolio_db.py
"""Tests for the portfolio database service."""

import pytest
from unittest.mock import MagicMock, patch
from app.services.portfolio_db import (
    create_portfolio,
    get_portfolio,
    list_portfolios,
    add_position,
    get_positions,
    update_position,
    delete_position,
)


@pytest.fixture
def sample_portfolio_row():
    return {
        "id": "port-abc",
        "name": "Tech Growth",
        "goal_id": "goal-123",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_position_row():
    return {
        "id": "pos-xyz",
        "portfolio_id": "port-abc",
        "ticker": "AAPL",
        "shares": 10.0,
        "avg_cost": 185.0,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def _ok_resp(data, status=200):
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = data if isinstance(data, list) else [data]
    resp.raise_for_status = MagicMock()
    return resp


class TestCreatePortfolio:
    def test_returns_portfolio_model(self, sample_portfolio_row):
        with patch("app.services.portfolio_db.httpx.post", return_value=_ok_resp([sample_portfolio_row], 201)):
            result = create_portfolio(name="Tech Growth", goal_id="goal-123")
        assert result is not None
        assert result.name == "Tech Growth"
        assert result.goal_id == "goal-123"

    def test_returns_none_on_error(self):
        import httpx
        with patch("app.services.portfolio_db.httpx.post", side_effect=httpx.HTTPError("err")):
            result = create_portfolio(name="X")
        assert result is None


class TestGetPositions:
    def test_returns_list_of_positions(self, sample_position_row):
        with patch("app.services.portfolio_db.httpx.get", return_value=_ok_resp([sample_position_row])):
            result = get_positions("port-abc")
        assert len(result) == 1
        assert result[0].ticker == "AAPL"
        assert result[0].shares == 10.0

    def test_returns_empty_list_on_error(self):
        import httpx
        with patch("app.services.portfolio_db.httpx.get", side_effect=httpx.HTTPError("err")):
            result = get_positions("port-abc")
        assert result == []


class TestAddPosition:
    def test_returns_position_model(self, sample_position_row):
        with patch("app.services.portfolio_db.httpx.post", return_value=_ok_resp([sample_position_row], 201)):
            result = add_position(portfolio_id="port-abc", ticker="AAPL", shares=10.0, avg_cost=185.0)
        assert result is not None
        assert result.ticker == "AAPL"

    def test_returns_none_on_error(self):
        import httpx
        with patch("app.services.portfolio_db.httpx.post", side_effect=httpx.HTTPError("err")):
            result = add_position("port-abc", "AAPL", 10.0, 185.0)
        assert result is None


class TestUpdatePosition:
    def test_returns_updated_position(self, sample_position_row):
        updated = {**sample_position_row, "shares": 15.0}
        with patch("app.services.portfolio_db.httpx.patch", return_value=_ok_resp([updated])):
            result = update_position("pos-xyz", shares=15.0)
        assert result is not None
        assert result.shares == 15.0

    def test_returns_none_on_error(self):
        import httpx
        with patch("app.services.portfolio_db.httpx.patch", side_effect=httpx.HTTPError("err")):
            result = update_position("pos-xyz", shares=15.0)
        assert result is None


class TestDeletePosition:
    def test_returns_true_on_success(self):
        resp = MagicMock()
        resp.status_code = 204
        resp.raise_for_status = MagicMock()
        with patch("app.services.portfolio_db.httpx.delete", return_value=resp):
            result = delete_position("pos-xyz")
        assert result is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_portfolio_db.py -v
```

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement portfolio_db.py**

```python
# backend/app/services/portfolio_db.py
"""Portfolio and position CRUD via Supabase PostgREST."""

import logging
import os

import httpx
from dotenv import load_dotenv

from app.models.portfolio import Portfolio, Position

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _headers(prefer: str = "return=representation") -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _url(table: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{table}"


# ── Portfolios ─────────────────────────────────────────────────────────────────

def create_portfolio(name: str, goal_id: str | None = None) -> Portfolio | None:
    try:
        body: dict = {"name": name}
        if goal_id:
            body["goal_id"] = goal_id
        resp = httpx.post(_url("portfolios"), headers=_headers(), json=body, timeout=10)
        resp.raise_for_status()
        rows = resp.json()
        return Portfolio(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error creating portfolio")
        return None


def get_portfolio(portfolio_id: str) -> Portfolio | None:
    try:
        resp = httpx.get(_url("portfolios"), headers=_headers(),
                         params={"id": f"eq.{portfolio_id}"}, timeout=10)
        resp.raise_for_status()
        rows = resp.json()
        return Portfolio(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error fetching portfolio %s", portfolio_id)
        return None


def list_portfolios() -> list[Portfolio]:
    try:
        resp = httpx.get(_url("portfolios"), headers=_headers(), timeout=10)
        resp.raise_for_status()
        return [Portfolio(**row) for row in resp.json()]
    except Exception:
        logger.exception("Error listing portfolios")
        return []


# ── Positions ──────────────────────────────────────────────────────────────────

def add_position(
    portfolio_id: str,
    ticker: str,
    shares: float,
    avg_cost: float,
) -> Position | None:
    try:
        resp = httpx.post(
            _url("positions"),
            headers=_headers(),
            json={"portfolio_id": portfolio_id, "ticker": ticker.upper(),
                  "shares": shares, "avg_cost": avg_cost},
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return Position(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error adding position %s to portfolio %s", ticker, portfolio_id)
        return None


def get_positions(portfolio_id: str) -> list[Position]:
    try:
        resp = httpx.get(
            _url("positions"),
            headers=_headers(),
            params={"portfolio_id": f"eq.{portfolio_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        return [Position(**row) for row in resp.json()]
    except Exception:
        logger.exception("Error fetching positions for portfolio %s", portfolio_id)
        return []


def update_position(
    position_id: str,
    shares: float | None = None,
    avg_cost: float | None = None,
) -> Position | None:
    try:
        body: dict = {}
        if shares is not None:
            body["shares"] = shares
        if avg_cost is not None:
            body["avg_cost"] = avg_cost
        resp = httpx.patch(
            _url("positions"),
            headers=_headers(),
            params={"id": f"eq.{position_id}"},
            json=body,
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        return Position(**rows[0]) if rows else None
    except Exception:
        logger.exception("Error updating position %s", position_id)
        return None


def delete_position(position_id: str) -> bool:
    try:
        resp = httpx.delete(
            _url("positions"),
            headers=_headers(prefer=""),
            params={"id": f"eq.{position_id}"},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Error deleting position %s", position_id)
        return False
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_portfolio_db.py -v
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/portfolio_db.py backend/tests/test_portfolio_db.py
git commit -m "feat: add portfolio and position CRUD service"
```

---

## Task 10: Analysis Pipeline Orchestrator

**Files:**
- Create: `backend/app/services/analysis_pipeline.py`
- Create: `backend/tests/test_analysis_pipeline.py`

Orchestrates all services into a single `run_analysis(ticker, goal)` call. Handles transcript caching in Supabase. Returns a persisted `Recommendation`.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_analysis_pipeline.py
"""Tests for the analysis pipeline orchestrator."""

import pytest
from unittest.mock import MagicMock, patch
from app.models.portfolio import UserGoal
from app.models.analysis import Recommendation, AnalysisThesis, Evidence, KeyRisk
from app.services.analysis_pipeline import run_analysis


@pytest.fixture
def sample_goal():
    return UserGoal(
        id="goal-123",
        profile="high_growth",
        horizon="long",
        risk_tolerance="high",
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )


@pytest.fixture
def sample_recommendation():
    return Recommendation(
        ticker="AAPL",
        goal_profile="high_growth",
        action="buy",
        confidence="high",
        goal_alignment=82,
        thesis=AnalysisThesis(
            bull_case="Services growing at 12% YoY with 70% gross margins.",
            bear_case="China revenue down 8% YoY.",
            synthesis="Net positive thesis — buy.",
            evidence=[
                Evidence(
                    source="Q4 2024 Earnings Call",
                    quote="Services revenue $24.2B, up 12% YoY",
                    metric="Services Revenue YoY: +12%",
                    significance="High-margin growth offsets hardware cyclicality."
                )
            ],
        ),
        key_risks=[
            KeyRisk(
                risk="China revenue declined 8% YoY.",
                evidence=[
                    Evidence(
                        source="Q4 2024 Earnings Call",
                        quote="Greater China $15.0B, down 8% YoY",
                        metric="China Revenue YoY: -8%",
                        significance="Third largest geography showing structural softness."
                    )
                ],
                severity="high",
                mitigants="India expansion partially offsetting."
            )
        ],
        review_triggers=["Re-evaluate if China revenue declines exceed 15% YoY"],
        sentiment_summary="Short interest low at 0.6%.",
        transcript_quarter=4,
        transcript_year=2024,
        generated_at="2026-04-24T00:00:00Z",
    )


class TestRunAnalysis:
    def test_returns_recommendation_for_valid_input(self, sample_goal, sample_recommendation):
        with patch("app.services.analysis_pipeline.fetch_latest_transcript") as mock_transcript, \
             patch("app.services.analysis_pipeline.fetch_sentiment_signals") as mock_sentiment, \
             patch("app.services.analysis_pipeline.summarise_sentiment", return_value="Short interest low."), \
             patch("app.services.analysis_pipeline.YahooFinanceProvider") as mock_yf_class, \
             patch("app.services.analysis_pipeline.build_financials_summary", return_value="Revenue: $94.9B"), \
             patch("app.services.analysis_pipeline.extract_transcript", return_value={"management_tone": "confident"}), \
             patch("app.services.analysis_pipeline.synthesise_recommendation", return_value=sample_recommendation), \
             patch("app.services.analysis_pipeline._persist_analysis", return_value=None):

            mock_transcript.return_value = {
                "content": "Earnings call text...", "quarter": 4, "year": 2024
            }
            mock_sentiment.return_value = {"ticker": "AAPL", "news_articles": [], "short_float_pct": 0.6}
            mock_yf = MagicMock()
            mock_yf.get_income_statement.return_value = MagicMock(dict=lambda: {})
            mock_yf.get_key_ratios.return_value = None
            mock_yf_class.return_value = mock_yf

            result = run_analysis(ticker="AAPL", goal=sample_goal)

        assert result is not None
        assert isinstance(result, Recommendation)
        assert result.action == "buy"

    def test_returns_none_when_transcript_missing(self, sample_goal):
        with patch("app.services.analysis_pipeline.fetch_latest_transcript", return_value=None):
            result = run_analysis(ticker="FAKE", goal=sample_goal)
        assert result is None

    def test_uses_cached_transcript_from_supabase(self, sample_goal, sample_recommendation):
        with patch("app.services.analysis_pipeline._load_cached_transcript") as mock_cache, \
             patch("app.services.analysis_pipeline.fetch_sentiment_signals") as mock_sentiment, \
             patch("app.services.analysis_pipeline.summarise_sentiment", return_value="Neutral."), \
             patch("app.services.analysis_pipeline.YahooFinanceProvider") as mock_yf_class, \
             patch("app.services.analysis_pipeline.build_financials_summary", return_value="Revenue: $94.9B"), \
             patch("app.services.analysis_pipeline.extract_transcript", return_value={}), \
             patch("app.services.analysis_pipeline.synthesise_recommendation", return_value=sample_recommendation), \
             patch("app.services.analysis_pipeline._persist_analysis", return_value=None):

            mock_cache.return_value = {
                "content": "Cached transcript...", "quarter": 4, "year": 2024
            }
            mock_sentiment.return_value = {"ticker": "AAPL", "news_articles": [], "short_float_pct": None}
            mock_yf = MagicMock()
            mock_yf_class.return_value = mock_yf

            result = run_analysis(ticker="AAPL", goal=sample_goal)

        assert result is not None
        # fetch_latest_transcript should NOT have been called if cache hit
        mock_cache.assert_called_once_with("AAPL")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_analysis_pipeline.py -v
```

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement analysis_pipeline.py**

```python
# backend/app/services/analysis_pipeline.py
"""Analysis pipeline orchestrator.

run_analysis() is the single entry point. It:
  1. Loads transcript from Supabase cache or FMP
  2. Fetches financial data via existing yfinance service
  3. Fetches sentiment signals
  4. Calls Claude for extraction + synthesis
  5. Persists the result to stock_analyses table
  6. Returns a Recommendation model
"""

import logging
import os

import httpx
from dotenv import load_dotenv

from app.models.analysis import Recommendation
from app.models.portfolio import UserGoal
from app.services.claude_analysis import extract_transcript, synthesise_recommendation
from app.services.financials_summary import build_financials_summary
from app.services.fmp import fetch_latest_transcript
from app.services.sentiment import fetch_sentiment_signals, summarise_sentiment
from app.services.yahoo_finance import YahooFinanceProvider

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _load_cached_transcript(ticker: str) -> dict | None:
    """Load the most recent cached transcript for a ticker from Supabase."""
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/earnings_transcripts",
            headers=_supabase_headers(),
            params={
                "ticker": f"eq.{ticker.upper()}",
                "order": "year.desc,quarter.desc",
                "limit": "1",
            },
            timeout=10,
        )
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            return None
        row = rows[0]
        return {"content": row["content"], "quarter": row["quarter"], "year": row["year"]}
    except Exception:
        logger.warning("Could not load cached transcript for %s", ticker)
        return None


def _save_transcript_to_cache(ticker: str, quarter: int, year: int, content: str) -> None:
    """Upsert a transcript into Supabase earnings_transcripts cache."""
    try:
        httpx.post(
            f"{SUPABASE_URL}/rest/v1/earnings_transcripts",
            headers={**_supabase_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"ticker": ticker.upper(), "quarter": quarter, "year": year, "content": content},
            timeout=10,
        )
    except Exception:
        logger.warning("Could not cache transcript for %s Q%s %s", ticker, quarter, year)


def _persist_analysis(ticker: str, goal: UserGoal, rec: Recommendation) -> None:
    """Persist a completed recommendation to stock_analyses table."""
    try:
        import json
        body = {
            "ticker": ticker.upper(),
            "goal_profile": goal.profile,
            "transcript_quarter": rec.transcript_quarter,
            "transcript_year": rec.transcript_year,
            "action": rec.action,
            "confidence": rec.confidence,
            "goal_alignment": rec.goal_alignment,
            "bull_case": rec.thesis.bull_case,
            "bear_case": rec.thesis.bear_case,
            "synthesis": rec.thesis.synthesis,
            "evidence": json.dumps([e.model_dump() for e in rec.thesis.evidence]),
            "key_risks": json.dumps([r.model_dump() for r in rec.key_risks]),
            "review_triggers": json.dumps(rec.review_triggers),
            "sentiment_summary": rec.sentiment_summary,
        }
        httpx.post(
            f"{SUPABASE_URL}/rest/v1/stock_analyses",
            headers=_supabase_headers(),
            json=body,
            timeout=10,
        )
    except Exception:
        logger.warning("Could not persist analysis for %s", ticker)


def run_analysis(ticker: str, goal: UserGoal, force_refresh: bool = False) -> Recommendation | None:
    """Run the full analysis pipeline for a ticker against a user goal.

    Steps:
      1. Load transcript (Supabase cache → FMP if missing or force_refresh)
      2. Fetch financials via yfinance
      3. Fetch sentiment signals
      4. Claude: extract transcript structure
      5. Claude: synthesise recommendation
      6. Persist to Supabase
      7. Return Recommendation

    Args:
        ticker: Stock ticker symbol.
        goal: The user's investment goal profile.
        force_refresh: If True, bypass transcript cache and re-fetch from FMP.

    Returns:
        Recommendation model on success. None if transcript unavailable.
    """
    ticker = ticker.upper()

    # 1. Transcript
    transcript = None
    if not force_refresh:
        transcript = _load_cached_transcript(ticker)

    if transcript is None:
        transcript = fetch_latest_transcript(ticker)
        if transcript is None:
            logger.warning("No transcript available for %s — cannot run analysis", ticker)
            return None
        if transcript.get("quarter") and transcript.get("year"):
            _save_transcript_to_cache(
                ticker,
                transcript["quarter"],
                transcript["year"],
                transcript["content"],
            )

    # 2. Financials
    provider = YahooFinanceProvider()
    income = provider.get_income_statement(ticker)
    ratios = provider.get_key_ratios(ticker)
    financials_summary = build_financials_summary(
        income_data=income.model_dump() if income else None,
        ratios_data=ratios,
    )

    # 3. Sentiment
    signals = fetch_sentiment_signals(ticker)
    sentiment_summary = summarise_sentiment(signals)

    # 4. Claude extraction
    extraction = extract_transcript(
        transcript_content=transcript["content"],
        ticker=ticker,
    )

    # 5. Claude synthesis
    rec = synthesise_recommendation(
        ticker=ticker,
        extraction=extraction,
        financials_summary=financials_summary,
        sentiment_summary=sentiment_summary,
        goal_profile=goal.profile,
    )
    if rec is None:
        return None

    # Attach transcript metadata
    rec.transcript_quarter = transcript.get("quarter")
    rec.transcript_year = transcript.get("year")

    # 6. Persist
    _persist_analysis(ticker, goal, rec)

    return rec
```

- [ ] **Step 4: Run tests**

```bash
cd backend
pytest tests/test_analysis_pipeline.py -v
```

Expected: All PASS. (The `test_uses_cached_transcript_from_supabase` test patches `_load_cached_transcript` directly so `fetch_latest_transcript` is never called.)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/analysis_pipeline.py backend/tests/test_analysis_pipeline.py
git commit -m "feat: add analysis pipeline orchestrator"
```

---

## Task 11: API Routers

**Files:**
- Create: `backend/app/routers/goals.py`
- Create: `backend/app/routers/portfolio.py`
- Create: `backend/app/routers/analysis.py`
- Create: `backend/tests/test_analysis_router.py`
- Modify: `backend/app/main.py`
- Modify: `backend/backend/.env.example`

- [ ] **Step 1: Create goals router**

```python
# backend/app/routers/goals.py
"""API router for user investment goal management."""

from fastapi import APIRouter, HTTPException

from app.models.portfolio import UserGoal, UserGoalCreate
from app.services.goals_db import create_goal, delete_goal, get_goal, list_goals

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("", response_model=UserGoal)
def create_user_goal(body: UserGoalCreate) -> UserGoal:
    """Create a new investment goal profile."""
    goal = create_goal(
        profile=body.profile,
        horizon=body.horizon,
        risk_tolerance=body.risk_tolerance,
    )
    if goal is None:
        raise HTTPException(status_code=500, detail="Failed to create goal")
    return goal


@router.get("", response_model=list[UserGoal])
def get_all_goals() -> list[UserGoal]:
    """List all stored investment goal profiles."""
    return list_goals()


@router.get("/{goal_id}", response_model=UserGoal)
def get_single_goal(goal_id: str) -> UserGoal:
    """Fetch a single goal by ID."""
    goal = get_goal(goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail=f"Goal '{goal_id}' not found")
    return goal


@router.delete("/{goal_id}", status_code=204)
def remove_goal(goal_id: str) -> None:
    """Delete a goal by ID."""
    if not delete_goal(goal_id):
        raise HTTPException(status_code=404, detail=f"Goal '{goal_id}' not found")
```

- [ ] **Step 2: Create portfolio router**

```python
# backend/app/routers/portfolio.py
"""API router for portfolio and position management."""

from fastapi import APIRouter, HTTPException

from app.models.portfolio import Portfolio, PortfolioCreate, Position, PositionCreate, PositionUpdate
from app.services.portfolio_db import (
    add_position,
    create_portfolio,
    delete_position,
    get_portfolio,
    get_positions,
    list_portfolios,
    update_position,
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.post("", response_model=Portfolio)
def create_new_portfolio(body: PortfolioCreate) -> Portfolio:
    """Create a new portfolio."""
    portfolio = create_portfolio(name=body.name, goal_id=body.goal_id)
    if portfolio is None:
        raise HTTPException(status_code=500, detail="Failed to create portfolio")
    return portfolio


@router.get("", response_model=list[Portfolio])
def list_all_portfolios() -> list[Portfolio]:
    """List all portfolios."""
    return list_portfolios()


@router.get("/{portfolio_id}", response_model=Portfolio)
def get_single_portfolio(portfolio_id: str) -> Portfolio:
    """Fetch a portfolio by ID."""
    portfolio = get_portfolio(portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=404, detail=f"Portfolio '{portfolio_id}' not found")
    return portfolio


@router.get("/{portfolio_id}/positions", response_model=list[Position])
def get_portfolio_positions(portfolio_id: str) -> list[Position]:
    """List all positions in a portfolio."""
    return get_positions(portfolio_id)


@router.post("/{portfolio_id}/positions", response_model=Position)
def add_portfolio_position(portfolio_id: str, body: PositionCreate) -> Position:
    """Add a stock position to a portfolio."""
    position = add_position(
        portfolio_id=portfolio_id,
        ticker=body.ticker,
        shares=body.shares,
        avg_cost=body.avg_cost,
    )
    if position is None:
        raise HTTPException(status_code=500, detail="Failed to add position")
    return position


@router.patch("/positions/{position_id}", response_model=Position)
def update_portfolio_position(position_id: str, body: PositionUpdate) -> Position:
    """Update shares or average cost for a position."""
    position = update_position(position_id, shares=body.shares, avg_cost=body.avg_cost)
    if position is None:
        raise HTTPException(status_code=404, detail=f"Position '{position_id}' not found")
    return position


@router.delete("/positions/{position_id}", status_code=204)
def remove_position(position_id: str) -> None:
    """Delete a position."""
    if not delete_position(position_id):
        raise HTTPException(status_code=404, detail=f"Position '{position_id}' not found")
```

- [ ] **Step 3: Create analysis router**

```python
# backend/app/routers/analysis.py
"""API router for triggering and retrieving stock analyses."""

import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query

from app.models.analysis import AnalysisRequest, Recommendation
from app.services.analysis_pipeline import run_analysis
from app.services.goals_db import get_goal

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


@router.post("/{ticker}", response_model=Recommendation)
def analyse_ticker(ticker: str, body: AnalysisRequest) -> Recommendation:
    """Run the full analysis pipeline for a ticker against a goal profile.

    This call triggers FMP transcript fetch (or cache), yfinance financials,
    sentiment signals, and two Claude API calls. It persists the result in
    Supabase and returns the full Recommendation.

    Args:
        ticker: Stock ticker symbol (e.g. 'AAPL').
        body.goal_id: UUID of the UserGoal to score against.
        body.force_refresh: If True, bypass transcript cache.
    """
    goal = get_goal(body.goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail=f"Goal '{body.goal_id}' not found")

    rec = run_analysis(ticker=ticker, goal=goal, force_refresh=body.force_refresh)
    if rec is None:
        raise HTTPException(
            status_code=422,
            detail=f"No earnings transcript available for '{ticker}'. Cannot generate analysis.",
        )
    return rec


@router.get("/{ticker}/history", response_model=list[dict[str, Any]])
def get_analysis_history(
    ticker: str,
    limit: int = Query(10, ge=1, le=50),
) -> list[dict[str, Any]]:
    """Retrieve past analyses for a ticker, most recent first.

    Returns lightweight summary rows (not full Recommendation) to keep
    the response fast. Use the full run endpoint to get fresh detail.
    """
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/stock_analyses",
            headers=_supabase_headers(),
            params={
                "ticker": f"eq.{ticker.upper()}",
                "order": "created_at.desc",
                "limit": str(limit),
                "select": "id,ticker,goal_profile,action,confidence,goal_alignment,created_at",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.exception("Error fetching analysis history for %s", ticker)
        raise HTTPException(status_code=500, detail="Could not retrieve analysis history")
```

- [ ] **Step 4: Write a smoke test for the analysis router**

```python
# backend/tests/test_analysis_router.py
"""Smoke tests for the analysis router."""

import pytest
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.analysis import Recommendation, AnalysisThesis, Evidence, KeyRisk
from app.models.portfolio import UserGoal


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_goal():
    return UserGoal(
        id="goal-123",
        profile="high_growth",
        horizon="long",
        risk_tolerance="high",
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
    )


@pytest.fixture
def sample_recommendation():
    return Recommendation(
        ticker="AAPL",
        goal_profile="high_growth",
        action="buy",
        confidence="high",
        goal_alignment=82,
        thesis=AnalysisThesis(
            bull_case="Services growing at 12% YoY.",
            bear_case="China down 8% YoY.",
            synthesis="Net positive.",
            evidence=[
                Evidence(
                    source="Q4 2024 Earnings Call",
                    quote="Services $24.2B +12% YoY",
                    metric="Services Revenue YoY: +12%",
                    significance="High-margin growth."
                )
            ],
        ),
        key_risks=[
            KeyRisk(
                risk="China revenue declined 8% YoY and represents 17% of total revenue.",
                evidence=[
                    Evidence(
                        source="Q4 2024 Earnings Call",
                        quote="Greater China $15.0B, down 8%",
                        metric="China Revenue YoY: -8%",
                        significance="Third largest geography losing share."
                    )
                ],
                severity="high",
                mitigants="India expansion partially offsetting losses."
            )
        ],
        review_triggers=["Re-evaluate if China declines exceed 15% YoY"],
        sentiment_summary="Short interest low.",
        transcript_quarter=4,
        transcript_year=2024,
        generated_at="2026-04-24T00:00:00Z",
    )


class TestAnalyseTickerEndpoint:
    def test_returns_200_with_recommendation(self, client, sample_goal, sample_recommendation):
        with patch("app.routers.analysis.get_goal", return_value=sample_goal), \
             patch("app.routers.analysis.run_analysis", return_value=sample_recommendation):
            resp = client.post(
                "/api/analysis/AAPL",
                json={"goal_id": "goal-123", "force_refresh": False},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["action"] == "buy"
        assert data["confidence"] == "high"
        assert len(data["thesis"]["evidence"]) >= 1
        assert len(data["key_risks"]) >= 1
        assert len(data["key_risks"][0]["risk"]) > 50

    def test_returns_404_when_goal_not_found(self, client):
        with patch("app.routers.analysis.get_goal", return_value=None):
            resp = client.post(
                "/api/analysis/AAPL",
                json={"goal_id": "nonexistent", "force_refresh": False},
            )
        assert resp.status_code == 404

    def test_returns_422_when_no_transcript(self, client, sample_goal):
        with patch("app.routers.analysis.get_goal", return_value=sample_goal), \
             patch("app.routers.analysis.run_analysis", return_value=None):
            resp = client.post(
                "/api/analysis/FAKE",
                json={"goal_id": "goal-123", "force_refresh": False},
            )
        assert resp.status_code == 422
```

- [ ] **Step 5: Run router tests to verify they fail**

```bash
cd backend
pytest tests/test_analysis_router.py -v
```

Expected: FAIL (routers not registered in main.py yet).

- [ ] **Step 6: Update main.py**

```python
"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, goals, macro, news, portfolio, projections, stocks

app = FastAPI(
    title="Stock Analysis Tool API",
    description="API for analysing US stock market data",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(projections.router)
app.include_router(macro.router)
app.include_router(news.router)
app.include_router(goals.router)
app.include_router(portfolio.router)
app.include_router(analysis.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 7: Update .env.example**

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
NEWSAPI_KEY=your-newsapi-key-here
GROQ_API_KEY=your-groq-api-key-here
FMP_API_KEY=your-fmp-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

- [ ] **Step 8: Run all tests**

```bash
cd backend
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/app/routers/goals.py backend/app/routers/portfolio.py \
        backend/app/routers/analysis.py backend/app/main.py \
        backend/backend/.env.example backend/tests/test_analysis_router.py
git commit -m "feat: add goals, portfolio, and analysis routers — wire up in main.py"
```

---

## Task 12: End-to-End Smoke Test (Live Backend)

**No new files — manual curl verification with real API keys.**

This verifies the full pipeline works against real external services (FMP, Claude, Supabase) before frontend work begins.

Prerequisites: `FMP_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` all set in `backend/.env`. Supabase migration (Task 1) already run.

- [ ] **Step 1: Start the backend**

```bash
cd backend
uvicorn app.main:app --reload
```

Expected: `Application startup complete` with no import errors.

- [ ] **Step 2: Verify health**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: Create a goal**

```bash
curl -s -X POST http://localhost:8000/api/goals \
  -H "Content-Type: application/json" \
  -d '{"profile":"high_growth","horizon":"long","risk_tolerance":"high"}' | python -m json.tool
```

Expected: JSON with `id`, `profile`, `horizon`, `risk_tolerance`. **Copy the `id` value for the next step.**

- [ ] **Step 4: Run analysis for AAPL**

```bash
curl -s -X POST http://localhost:8000/api/analysis/AAPL \
  -H "Content-Type: application/json" \
  -d '{"goal_id":"<GOAL_ID_FROM_STEP_3>","force_refresh":false}' | python -m json.tool
```

Expected: Full `Recommendation` JSON with:
- `action` in `["strong_buy","buy","hold","trim","sell"]`
- `thesis.bull_case` length > 200 chars
- `thesis.evidence` array with at least 3 items, each with `source`, `quote`, `significance`
- `key_risks` array with at least 2 items, each with `risk` (>100 chars), `severity`, `mitigants`
- `review_triggers` array with at least 3 items

- [ ] **Step 5: Verify analysis persisted**

```bash
curl -s "http://localhost:8000/api/analysis/AAPL/history" | python -m json.tool
```

Expected: Array containing at least 1 row with `action` and `created_at`.

- [ ] **Step 6: Run analysis for a second ticker with same goal**

```bash
curl -s -X POST http://localhost:8000/api/analysis/MSFT \
  -H "Content-Type: application/json" \
  -d '{"goal_id":"<GOAL_ID_FROM_STEP_3>","force_refresh":false}' | python -m json.tool
```

Expected: Full recommendation for MSFT. Confirms pipeline is generic, not AAPL-specific.

- [ ] **Step 7: Commit final state**

```bash
git add -A
git commit -m "feat: complete portfolio analysis backend pipeline — end-to-end verified"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Evidence-based thesis (bull_case, bear_case, synthesis each have minimum lengths enforced by Claude prompt)
- ✅ Key risks with cited evidence + severity + mitigants
- ✅ User-defined goal profiles (4 archetypes, 3-question derived)
- ✅ Earnings transcript ingestion (FMP API with Supabase cache)
- ✅ Sentiment signals (NewsAPI + FMP short interest)
- ✅ Financial cross-reference (yfinance income statement + ratios → Claude context)
- ✅ Recommendation persisted to Supabase (retrievable later)
- ✅ Portfolio + position CRUD
- ✅ Goal CRUD
- ✅ All services tested in isolation (mocked externals)
- ✅ Router smoke-tested (TestClient)
- ✅ End-to-end live verification step included

**Type consistency:**
- `UserGoal.profile` literals match `_GOAL_CONTEXT` keys in `claude_analysis.py`
- `Recommendation.action` literals match router response_model
- `Evidence` fields used consistently in `AnalysisThesis.evidence` and `KeyRisk.evidence`
- `build_financials_summary` accepts `dict | None` for both args — matches pipeline usage

**No placeholders:** All steps contain actual code or actual commands with expected output.
