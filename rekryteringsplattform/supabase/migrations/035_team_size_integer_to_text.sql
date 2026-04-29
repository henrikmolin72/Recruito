-- Convert team_size from integer to text, mapping existing values to brackets
ALTER TABLE jobs
  ALTER COLUMN team_size TYPE text
  USING CASE
    WHEN team_size IS NULL THEN NULL
    WHEN team_size::integer = 0 THEN 'No team management'
    WHEN team_size::integer <= 5 THEN '1 - 5'
    WHEN team_size::integer <= 10 THEN '6 - 10'
    WHEN team_size::integer <= 20 THEN '11 - 20'
    WHEN team_size::integer <= 50 THEN '21 - 50'
    WHEN team_size::integer <= 70 THEN '51 - 70'
    WHEN team_size::integer <= 100 THEN '71 - 100'
    WHEN team_size::integer <= 200 THEN '101 - 200'
    ELSE '201+'
  END;
