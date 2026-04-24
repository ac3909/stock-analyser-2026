export interface Portfolio {
  id: string;
  name: string;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  portfolio_id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  created_at: string;
  updated_at: string;
}

export interface PositionPerformance {
  id: string;
  portfolio_id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  current_price: number | null;
  current_value: number | null;
  cost_basis: number;
  gain_loss: number | null;
  return_pct: number | null;
  weight: number | null;
}

export interface PortfolioPerformance {
  portfolio_id: string;
  portfolio_name: string;
  positions: PositionPerformance[];
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  total_return_pct: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface FactorScores {
  value: number;
  quality: number;
  growth: number;
  momentum: number;
}

export interface FactorCommentary {
  value: string;
  quality: string;
  growth: string;
  momentum: string;
}

export interface PortfolioScore {
  portfolio_id: string;
  overall_score: number;
  grade: string;
  thesis: string;
  strengths: string[];
  risks: string[];
  factor_scores: FactorScores;
  factor_commentary: FactorCommentary;
  recommendations: string[];
  generated_at: string;
}
