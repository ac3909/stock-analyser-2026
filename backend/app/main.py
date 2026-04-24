"""FastAPI application entry point.

Creates the app, configures CORS for the Vite dev server,
and includes all API routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import macro, projections, stocks

app = FastAPI(
    title="Stock Analysis Tool API",
    description="API for analysing US stock market data",
    version="0.1.0",
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


@app.get("/health")
def health_check() -> dict[str, str]:
    """Simple health check endpoint to verify the API is running."""
    return {"status": "ok"}
