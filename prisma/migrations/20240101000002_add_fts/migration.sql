-- Migration: add_fts
-- Adds tsvector FTS columns, triggers, and GIN indexes for Ticket and Person tables.

-- ─── Ticket FTS ──────────────────────────────────────────────────────────────

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION ticket_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'B')    ||
    setweight(to_tsvector('english', coalesce(NEW.service_code, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_search_vector_trigger ON "Ticket";
CREATE TRIGGER ticket_search_vector_trigger
  BEFORE INSERT OR UPDATE OF description, address, service_code
  ON "Ticket"
  FOR EACH ROW EXECUTE FUNCTION ticket_search_vector_update();

CREATE INDEX IF NOT EXISTS ticket_search_vector_gin
  ON "Ticket" USING GIN (search_vector);

-- Backfill existing rows (safe on empty DB at first migration)
UPDATE "Ticket" SET search_vector =
  setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(address, '')), 'B')     ||
  setweight(to_tsvector('english', coalesce(service_code, '')), 'C');

-- ─── Person FTS ──────────────────────────────────────────────────────────────

ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS person_search_vector tsvector;

CREATE OR REPLACE FUNCTION person_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.person_search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A')  ||
    setweight(to_tsvector('simple', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_search_vector_trigger ON "Person";
CREATE TRIGGER person_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, email, phone
  ON "Person"
  FOR EACH ROW EXECUTE FUNCTION person_search_vector_update();

CREATE INDEX IF NOT EXISTS person_search_vector_gin
  ON "Person" USING GIN (person_search_vector);

UPDATE "Person" SET person_search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A')  ||
  setweight(to_tsvector('simple', coalesce(email, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(phone, '')), 'C');
