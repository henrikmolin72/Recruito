-- Client req 2026-07-14 (image 14-07-02): the free-text location field becomes
-- "Area name near job location / Zip code" and is OPTIONAL. Display composes
-- "City, Area, Country" from city + location + country instead (formatJobLocation).
-- No new table → no GRANT needed (CLAUDE.md §6).
ALTER TABLE jobs ALTER COLUMN location DROP NOT NULL;
