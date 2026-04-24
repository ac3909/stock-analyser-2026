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
