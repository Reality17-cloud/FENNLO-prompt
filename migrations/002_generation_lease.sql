-- A fresh lease token distinguishes retries of the same idempotent turn.
ALTER TABLE client_threads ADD COLUMN pending_token uuid;
