ALTER TABLE client_threads
  ADD COLUMN client_name text
  CHECK (client_name IS NULL OR length(btrim(client_name)) BETWEEN 1 AND 120);
