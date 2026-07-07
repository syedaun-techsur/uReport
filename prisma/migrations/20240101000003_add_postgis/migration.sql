-- Migration: add_postgis
-- Conditionally adds PostGIS geography column and GIST index to Ticket.
-- Safe to run even without PostGIS installed — DO $$ block guards all DDL.

DO $$
BEGIN
  -- Only proceed if PostGIS extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    -- Add geography columns (converts lat/lng to native PostGIS type)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Ticket' AND column_name = 'geog'
    ) THEN
      ALTER TABLE "Ticket"
        ADD COLUMN geog geography(Point, 4326)
        GENERATED ALWAYS AS (
          CASE
            WHEN lat IS NOT NULL AND lng IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            ELSE NULL
          END
        ) STORED;

      CREATE INDEX IF NOT EXISTS ticket_geog_gist
        ON "Ticket" USING GIST (geog);
    END IF;
  END IF;
END;
$$;
