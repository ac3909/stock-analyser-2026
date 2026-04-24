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
