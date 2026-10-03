-- Run once in Supabase SQL Editor. ISO date text preserves empty legacy dates.
CREATE TABLE public.documents (
 id text PRIMARY KEY, direction text NOT NULL CHECK(direction IN ('in','out','internal')),
 number text NOT NULL, title text NOT NULL, organization text NOT NULL,
 issuing_body text NOT NULL DEFAULT '', issued text NOT NULL, received text NOT NULL,
 category text NOT NULL, assignee text NOT NULL DEFAULT '', due text NOT NULL DEFAULT '',
 urgency text NOT NULL DEFAULT 'normal' CHECK(urgency IN ('normal','urgent','express')),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','processing','done')),
 notes text NOT NULL DEFAULT '', expires_on text NOT NULL DEFAULT '', replaced_by text NOT NULL DEFAULT '',
 search_text text NOT NULL DEFAULT '', file_key text, file_name text, file_size integer,
 created text NOT NULL, updated text NOT NULL
);
CREATE INDEX idx_documents_created ON public.documents(created DESC,id DESC);
CREATE INDEX idx_documents_received ON public.documents(received);
CREATE INDEX idx_documents_issued ON public.documents(issued);
CREATE INDEX idx_documents_direction_received ON public.documents(direction,received);
CREATE INDEX idx_documents_status_due ON public.documents(status,due);
CREATE INDEX idx_documents_expiry ON public.documents(expires_on);
CREATE UNIQUE INDEX idx_documents_file_key ON public.documents(file_key) WHERE file_key IS NOT NULL;
CREATE TABLE public.app_settings (key text PRIMARY KEY,value text NOT NULL);
CREATE TABLE public.pending_uploads (id text PRIMARY KEY,document_id text NOT NULL,drive_id text NOT NULL UNIQUE,file_name text NOT NULL,file_size integer NOT NULL CHECK(file_size BETWEEN 1 AND 10485760),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.login_attempts (key text PRIMARY KEY,attempts integer NOT NULL,window_start timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documents,public.app_settings,public.pending_uploads,public.login_attempts FROM anon,authenticated;
-- Server connects using DATABASE_URL. Never put this URL in NEXT_PUBLIC_* variables.
