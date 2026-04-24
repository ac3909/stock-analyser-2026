import api from "./api";
import type {
  Portfolio,
  PortfolioPerformance,
  PortfolioHistoryPoint,
  PortfolioScore,
  Position,
} from "../types/portfolio";

export const listPortfolios = (): Promise<Portfolio[]> =>
  api.get<Portfolio[]>("/api/portfolio").then((r) => r.data);

export const createPortfolio = (name: string): Promise<Portfolio> =>
  api.post<Portfolio>("/api/portfolio", { name }).then((r) => r.data);

export const getPortfolioPerformance = (portfolioId: string): Promise<PortfolioPerformance> =>
  api.get<PortfolioPerformance>(`/api/portfolio/${portfolioId}/performance`).then((r) => r.data);

export const getPortfolioHistory = (
  portfolioId: string,
  period = "1y"
): Promise<PortfolioHistoryPoint[]> =>
  api
    .get<PortfolioHistoryPoint[]>(`/api/portfolio/${portfolioId}/history?period=${period}`)
    .then((r) => r.data);

export const getPortfolioScore = (portfolioId: string): Promise<PortfolioScore> =>
  api.get<PortfolioScore>(`/api/portfolio/${portfolioId}/score`).then((r) => r.data);

export const addPosition = (
  portfolioId: string,
  ticker: string,
  shares: number,
  avgCost: number
): Promise<Position> =>
  api
    .post<Position>(`/api/portfolio/${portfolioId}/positions`, {
      ticker,
      shares,
      avg_cost: avgCost,
    })
    .then((r) => r.data);

export const deletePosition = (positionId: string): Promise<void> =>
  api.delete(`/api/portfolio/positions/${positionId}`).then(() => undefined);
