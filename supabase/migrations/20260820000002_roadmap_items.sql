-- Roadmap board. Adapted from BOND Platform's roadmap_items table
-- (male_007/projects/bond/db/migrations/031_lifecycle_tables.sql), trimmed to
-- a single table for the ZonZelf MVP — no lifecycle_initiatives join yet.
--
-- category is deliberately scoped to the Blue Ocean Contract's three
-- differentiators (onboarding, monitoring, community) plus the tooling that
-- supports them (calculators, admin, infrastructure). If a roadmap item
-- doesn't fit one of these, it should fail the feature-creep test in
-- CLAUDE.md before it fails to fit this enum.

create type public.roadmap_category as enum (
  'onboarding',
  'calculators',
  'monitoring',
  'community',
  'admin',
  'infrastructure'
);

create type public.roadmap_status as enum (
  'planned',
  'in_development',
  'in_test',
  'in_beta',
  'in_production',
  'cancelled'
);

create table public.roadmap_items (
  id                    bigint generated always as identity primary key,
  phase                 smallint not null default 0,
  category              public.roadmap_category not null default 'infrastructure',
  title                 text not null,
  description           text,
  status                public.roadmap_status not null default 'planned',
  dev_percent_complete  smallint not null default 0
                          check (dev_percent_complete between 0 and 100),
  is_public             boolean not null default true,
  display_order         smallint not null default 100,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index roadmap_items_phase_order_idx
  on public.roadmap_items (phase, display_order, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger roadmap_items_set_updated_at
  before update on public.roadmap_items
  for each row execute function public.set_updated_at();

alter table public.roadmap_items enable row level security;

create policy "roadmap_items: public reads public rows"
  on public.roadmap_items for select
  using (is_public = true);

create policy "roadmap_items: admins read all rows"
  on public.roadmap_items for select
  using (public.is_admin());

create policy "roadmap_items: admins insert"
  on public.roadmap_items for insert
  with check (public.is_admin());

create policy "roadmap_items: admins update"
  on public.roadmap_items for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "roadmap_items: admins delete"
  on public.roadmap_items for delete
  using (public.is_admin());

-- Same reason as profiles.sql — RLS needs a table-level GRANT underneath it,
-- and this project doesn't hand those out automatically for new tables.
grant select on public.roadmap_items to anon, authenticated;
grant insert, update, delete on public.roadmap_items to authenticated;
