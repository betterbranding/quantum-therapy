-- ============================================================================
-- QUANTUM THERAPY — Supabase schema
-- Run this once in the Supabase SQL Editor on a fresh project.
-- Safe to re-run: everything is guarded with IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type subscription_tier as enum ('free', 'pro', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('none', 'active', 'trialing', 'canceled', 'past_due');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- Replaces the old `users` table. auth.users owns identity; this owns app state.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text,
  full_name              text,
  avatar_url             text,
  role                   app_role not null default 'user',
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  subscription_tier      subscription_tier not null default 'free',
  subscription_status    subscription_status not null default 'none',
  current_period_end     timestamptz,
  onboarding_completed   boolean not null default false,
  ghl_contact_id         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  last_signed_in_at      timestamptz
);

create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);
create index if not exists profiles_tier_idx on public.profiles (subscription_tier);

-- ---------------------------------------------------------------------------
-- HELPERS
-- Postgres only allows IMMUTABLE functions inside a generated column, and the
-- built-in array_to_string() is merely STABLE. This wrapper is the standard fix
-- and lets protocol aliases participate in full text search.
-- ---------------------------------------------------------------------------
create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text language sql immutable parallel safe as $$
  select array_to_string(arr, sep);
$$;

-- ---------------------------------------------------------------------------
-- PROTOCOLS  (the CAFL database, server-side)
-- Previously bundled into the JS payload. Now queryable, cacheable and
-- statically renderable, which also makes every protocol an SEO landing page.
-- ---------------------------------------------------------------------------
create table if not exists public.protocols (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  name         text not null,
  category     text not null,
  aliases      text[] not null default '{}',
  frequencies  numeric[] not null,
  notes        text,
  description  text,
  source       text not null default 'CAFL',
  search_vec   tsvector generated always as (
                 setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A') ||
                 setweight(to_tsvector('english'::regconfig, coalesce(public.immutable_array_to_string(aliases, ' '), '')), 'B') ||
                 setweight(to_tsvector('english'::regconfig, coalesce(notes, '')), 'C')
               ) stored,
  created_at   timestamptz not null default now()
);

create index if not exists protocols_search_idx   on public.protocols using gin (search_vec);
create index if not exists protocols_name_trgm    on public.protocols using gin (name gin_trgm_ops);
create index if not exists protocols_category_idx on public.protocols (category);

-- ---------------------------------------------------------------------------
-- TONES  (the 22 standalone single frequencies)
-- ---------------------------------------------------------------------------
create table if not exists public.tones (
  id          text primary key,
  name        text not null,
  frequency   numeric not null,
  category    text not null,
  description text not null,
  benefits    text[] not null default '{}',
  accent      text not null default '#22d3ee',
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------------------
-- SESSIONS  (server-side usage tracking — tamper-proof, unlike the old
-- localStorage counter that users could clear to reset their free limit)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  protocol_id    bigint references public.protocols(id) on delete set null,
  tone_id        text references public.tones(id) on delete set null,
  title          text not null,
  frequencies    numeric[] not null default '{}',
  duration_secs  int not null default 0,
  completed      boolean not null default false,
  ambient_preset text,
  started_at     timestamptz not null default now()
);

create index if not exists sessions_user_time_idx on public.sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- FAVORITES
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  protocol_id bigint references public.protocols(id) on delete cascade,
  tone_id     text references public.tones(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint favorites_one_target check (num_nonnulls(protocol_id, tone_id) = 1)
);

create unique index if not exists favorites_protocol_uniq on public.favorites (user_id, protocol_id) where protocol_id is not null;
create unique index if not exists favorites_tone_uniq     on public.favorites (user_id, tone_id)     where tone_id is not null;

-- ---------------------------------------------------------------------------
-- KNOWLEDGE BASE
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_base (
  id          bigint generated always as identity primary key,
  title       text not null,
  description text,
  category    text,
  source      text,
  file_url    text,
  file_type   text default 'pdf',
  page_count  int,
  tags        text[] not null default '{}',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- STRIPE EVENT LOG (webhook idempotency — replays are a fact of life)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, last_signed_in_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        last_signed_in_at = now();
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- USAGE LIMITS  (enforced in the database, not the browser)
-- ============================================================================

create or replace function public.sessions_this_month(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.sessions
  where user_id = uid
    and started_at >= date_trunc('month', now());
$$;

create or replace function public.monthly_limit_for(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case (select subscription_tier from public.profiles where id = uid)
    when 'pro'     then 2147483647
    when 'premium' then 2147483647
    else 10
  end;
$$;

-- Single call the app makes to begin a session. Returns null when the free
-- monthly allowance is exhausted, so the limit cannot be bypassed client-side.
create or replace function public.start_session(
  p_title text,
  p_frequencies numeric[] default '{}',
  p_protocol_id bigint default null,
  p_tone_id text default null,
  p_ambient text default null
)
returns public.sessions
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  used int;
  lim int;
  row public.sessions;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select public.sessions_this_month(uid) into used;
  select public.monthly_limit_for(uid) into lim;

  if used >= lim then
    raise exception 'monthly session limit reached' using errcode = 'P0001';
  end if;

  insert into public.sessions (user_id, protocol_id, tone_id, title, frequencies, ambient_preset)
  values (uid, p_protocol_id, p_tone_id, p_title, p_frequencies, p_ambient)
  returning * into row;

  return row;
end $$;

create or replace function public.complete_session(p_id bigint, p_duration int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.sessions
     set completed = true, duration_secs = p_duration
   where id = p_id and user_id = auth.uid();
end $$;

-- Ranked protocol search used by the search page.
create or replace function public.search_protocols(q text, lim int default 40)
returns setof public.protocols
language sql stable as $$
  select *
  from public.protocols
  where q is null or q = ''
     or search_vec @@ websearch_to_tsquery('english', q)
     or name ilike '%' || q || '%'
  order by
    (name ilike q) desc,
    (name ilike q || '%') desc,
    ts_rank(search_vec, websearch_to_tsquery('english', coalesce(nullif(q, ''), 'a'))) desc,
    similarity(name, coalesce(q, '')) desc,
    name asc
  limit lim;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.protocols      enable row level security;
alter table public.tones          enable row level security;
alter table public.sessions       enable row level security;
alter table public.favorites      enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.stripe_events  enable row level security;

-- Content is public reference material: readable by everyone, writable by nobody
-- except the service role (which bypasses RLS).
drop policy if exists "protocols readable" on public.protocols;
create policy "protocols readable" on public.protocols for select using (true);

drop policy if exists "tones readable" on public.tones;
create policy "tones readable" on public.tones for select using (true);

drop policy if exists "kb readable" on public.knowledge_base;
create policy "kb readable" on public.knowledge_base for select using (true);

-- Users see and edit only their own row.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sessions read" on public.sessions;
create policy "own sessions read" on public.sessions for select using (auth.uid() = user_id);

drop policy if exists "own sessions delete" on public.sessions;
create policy "own sessions delete" on public.sessions for delete using (auth.uid() = user_id);
-- NOTE: no INSERT policy on purpose. Sessions are only created through
-- start_session(), which enforces the monthly cap.

drop policy if exists "own favorites all" on public.favorites;
create policy "own favorites all" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- stripe_events: service role only. No policies = no client access.

grant execute on function public.start_session(text, numeric[], bigint, text, text) to authenticated;
grant execute on function public.complete_session(bigint, int) to authenticated;
grant execute on function public.sessions_this_month(uuid) to authenticated;
grant execute on function public.monthly_limit_for(uuid) to authenticated;
grant execute on function public.search_protocols(text, int) to anon, authenticated;
