-- Migration 003: Nhật ký hoạt động văn bản (Audit Log)
-- Chạy một lần trong SQL Editor của Supabase
CREATE TABLE IF NOT EXISTS public.document_logs (
  id text PRIMARY KEY,
  document_id text NOT NULL,
  document_number text NOT NULL,
  action text NOT NULL CHECK(action IN ('create','update','delete','status_change')),
  details text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'Văn thư',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_logs_doc ON public.document_logs(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_logs_time ON public.document_logs(created_at DESC);

ALTER TABLE public.document_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_logs FROM anon,authenticated;
