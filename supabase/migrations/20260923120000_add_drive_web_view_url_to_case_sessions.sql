-- Migration: Add Google Drive recording link to case_sessions
alter table public.case_sessions
  add column if not exists drive_web_view_url text;
