"""API router for projection/scenario CRUD endpoints.

Wraps the Supabase database functions to provide a REST API
for saving, listing, updating, and deleting projection scenarios.
"""

from fastapi import APIRouter, HTTPException

from app.models.stock import Projection, ProjectionCreate, ProjectionUpdate
from app.services.database import (
    delete_projection,
    get_projections,
    is_configured,
    save_projection,
    update_projection,
)

router = APIRouter(prefix="/api/projections", tags=["projections"])


def _check_configured() -> None:
    """Raise 503 if Supabase is not configured."""
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.",
        )


@router.post("", response_model=Projection)
async def create_projection(body: ProjectionCreate) -> Projection:
    """Save a new projection scenario.

    Args:
        body: The projection data including ticker, title, and scenario payload.

    Returns:
        The created projection with its generated ID and timestamps.
    """
    _check_configured()
    row = await save_projection(body.ticker, body.title, body.data)
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to save projection")
    return Projection(**row)


@router.get("", response_model=list[Projection])
async def list_projections(ticker: str | None = None) -> list[Projection]:
    """List saved projections, optionally filtered by ticker.

    Args:
        ticker: If provided, only return projections for this ticker.

    Returns:
        A list of saved projection scenarios.
    """
    _check_configured()
    rows = await get_projections(ticker)
    return [Projection(**row) for row in rows]


@router.patch("/{projection_id}", response_model=Projection)
async def patch_projection(projection_id: str, body: ProjectionUpdate) -> Projection:
    """Update an existing projection.

    Args:
        projection_id: The UUID of the projection to update.
        body: The fields to update (title and/or data).

    Returns:
        The updated projection.
    """
    _check_configured()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    row = await update_projection(projection_id, updates)
    if row is None:
        raise HTTPException(status_code=404, detail="Projection not found")
    return Projection(**row)


@router.delete("/{projection_id}")
async def remove_projection(projection_id: str) -> dict[str, bool]:
    """Delete a projection by ID.

    Args:
        projection_id: The UUID of the projection to delete.

    Returns:
        A success indicator.
    """
    _check_configured()
    success = await delete_projection(projection_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete projection")
    return {"success": True}
