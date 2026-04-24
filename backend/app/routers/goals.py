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
