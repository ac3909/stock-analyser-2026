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
    """Run the full analysis pipeline for a ticker against a goal profile."""
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
    """Retrieve past analyses for a ticker, most recent first."""
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
