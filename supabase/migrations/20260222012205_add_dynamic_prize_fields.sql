ALTER TABLE tournaments ADD COLUMN prize_distribution TEXT DEFAULT 'winner';
ALTER TABLE tournaments ADD COLUMN platform_tax NUMERIC DEFAULT 0;
ALTER TABLE tournament_results ADD COLUMN place INTEGER DEFAULT 1;
