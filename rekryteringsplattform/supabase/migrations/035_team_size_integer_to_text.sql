-- Convert team_size from integer to text bracket strings.
-- Idempotent: safe to re-run if a prior partial migration left the column
-- already as text. Handles both states (integer + mixed text/numeric).

DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'team_size';

    IF col_type = 'integer' THEN
        -- Column still integer: convert in one ALTER, mapping each value to a bracket.
        ALTER TABLE jobs
          ALTER COLUMN team_size TYPE text
          USING CASE
            WHEN team_size IS NULL    THEN NULL
            WHEN team_size = 0        THEN 'No team management'
            WHEN team_size <= 5       THEN '1 - 5'
            WHEN team_size <= 10      THEN '6 - 10'
            WHEN team_size <= 20      THEN '11 - 20'
            WHEN team_size <= 50      THEN '21 - 50'
            WHEN team_size <= 70      THEN '51 - 70'
            WHEN team_size <= 100     THEN '71 - 100'
            WHEN team_size <= 200     THEN '101 - 200'
            ELSE '201+'
          END;

    ELSIF col_type IN ('text', 'character varying') THEN
        -- Column already text: normalize any leftover numeric strings to brackets.
        -- Bracket strings like '1 - 5' and 'No team management' are left untouched.
        UPDATE jobs
        SET team_size = CASE
            WHEN team_size = '0'                      THEN 'No team management'
            WHEN team_size::integer <= 5              THEN '1 - 5'
            WHEN team_size::integer <= 10             THEN '6 - 10'
            WHEN team_size::integer <= 20             THEN '11 - 20'
            WHEN team_size::integer <= 50             THEN '21 - 50'
            WHEN team_size::integer <= 70             THEN '51 - 70'
            WHEN team_size::integer <= 100            THEN '71 - 100'
            WHEN team_size::integer <= 200            THEN '101 - 200'
            ELSE '201+'
        END
        WHERE team_size ~ '^[0-9]+$';
    END IF;
END $$;
