-- Migration: Clinical analysis rules config for multi-session AI pattern analysis.
-- Deliberately empty by default -- see supabase/functions/family-session-analysis/index.ts,
-- which must refuse to invent a clinical framework when no row exists here.

create table if not exists public.clinical_analysis_rules (
  id uuid primary key default gen_random_uuid(),
  framework_name text not null,
  instructions text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_clinical_analysis_rules_updated_at on public.clinical_analysis_rules;
create trigger set_clinical_analysis_rules_updated_at
  before update on public.clinical_analysis_rules
  for each row execute function public.handle_family_system_updated_at();

alter table public.clinical_analysis_rules enable row level security;

create policy "Admins can view clinical analysis rules"
  on public.clinical_analysis_rules
  for select
  using (public.is_admin());

create policy "Admins can insert clinical analysis rules"
  on public.clinical_analysis_rules
  for insert
  with check (public.is_admin());

create policy "Admins can update clinical analysis rules"
  on public.clinical_analysis_rules
  for update
  using (public.is_admin());

create policy "Admins can delete clinical analysis rules"
  on public.clinical_analysis_rules
  for delete
  using (public.is_admin());

-- No seed row: the table stays empty until Mai's actual clinical framework is captured.
