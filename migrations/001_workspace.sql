CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (length(email) <= 254),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_owner ON user_sessions(user_id);
CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE client_threads (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  goal text NOT NULL CHECK(length(goal) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ARCHIVED','COMPLETED')),
  formation jsonb,
  version integer NOT NULL DEFAULT 0,
  pending_id uuid,
  pending_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX thread_owner ON client_threads(owner_id, updated_at DESC);
CREATE TABLE thread_turns (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES client_threads(id) ON DELETE CASCADE,
  sequence bigserial UNIQUE NOT NULL,
  kind text NOT NULL CHECK(kind IN ('REALITY','GOAL')),
  reality text NOT NULL CHECK(length(reality) BETWEEN 1 AND 20000),
  goal_at_turn text NOT NULL CHECK(length(goal_at_turn) BETWEEN 1 AND 4000),
  status text NOT NULL CHECK(status IN ('PENDING','COMPLETE','FAILED','EVENT')),
  result jsonb,
  formation jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  determined_at timestamptz
);
CREATE INDEX turn_thread ON thread_turns(thread_id, sequence DESC);
