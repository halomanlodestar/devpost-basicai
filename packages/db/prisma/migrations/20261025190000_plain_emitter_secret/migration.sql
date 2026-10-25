-- Emitter secrets are stored as-is (demo scope); the HMAC check on every request is unchanged.
ALTER TABLE "emitter" RENAME COLUMN "secret_enc" TO "secret";
