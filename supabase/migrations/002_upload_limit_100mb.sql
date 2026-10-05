-- Existing Supabase projects: run once in SQL Editor to allow 100 MB per file.
-- Re-running is safe. Existing documents and Drive files are not changed.
BEGIN;
ALTER TABLE public.pending_uploads
  DROP CONSTRAINT IF EXISTS pending_uploads_file_size_check;
ALTER TABLE public.pending_uploads
  ADD CONSTRAINT pending_uploads_file_size_check
  CHECK (file_size BETWEEN 1 AND 104857600);
COMMIT;
