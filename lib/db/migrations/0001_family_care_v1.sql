BEGIN;

CREATE TABLE IF NOT EXISTS family_care_contexts (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  display_label text NOT NULL DEFAULT 'Family Care',
  timezone text NOT NULL DEFAULT 'UTC',
  caregiver_a_label text NOT NULL DEFAULT 'Caregiver A',
  caregiver_b_label text NOT NULL DEFAULT 'Caregiver B',
  night_start_minute integer NOT NULL DEFAULT 1200 CHECK (night_start_minute BETWEEN 0 AND 1439),
  handoff_minute integer NOT NULL DEFAULT 0 CHECK (handoff_minute BETWEEN 0 AND 1439),
  morning_wake_minute integer NOT NULL DEFAULT 240 CHECK (morning_wake_minute BETWEEN 0 AND 1439),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS family_care_contexts_user_idx ON family_care_contexts (user_id);

CREATE TABLE IF NOT EXISTS family_care_events (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  client_event_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('feed', 'diaper', 'sleep', 'pump', 'note')),
  observed_at timestamptz NOT NULL,
  ended_at timestamptz,
  source_class text NOT NULL DEFAULT 'caregiver_observation' CHECK (source_class = 'caregiver_observation'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (ended_at IS NULL OR ended_at > observed_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS family_care_events_user_client_idx ON family_care_events (user_id, client_event_id);
CREATE INDEX IF NOT EXISTS family_care_events_user_observed_idx ON family_care_events (user_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS family_care_event_revisions (
  id serial PRIMARY KEY,
  event_id integer NOT NULL,
  user_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_care_event_revisions_owner_event_idx ON family_care_event_revisions (user_id, event_id);

CREATE TABLE IF NOT EXISTS family_care_handoffs (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  current_caregiver_label text,
  last_confirmed_action text,
  next_action text,
  watch_for text,
  can_wait text,
  support_needed text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS family_care_handoffs_user_idx ON family_care_handoffs (user_id);

COMMIT;
