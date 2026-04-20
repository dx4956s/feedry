create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rss_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  url text not null,
  category text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists rss_feeds_user_id_url_key on public.rss_feeds (user_id, url);
create index if not exists rss_feeds_user_id_idx on public.rss_feeds (user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists rss_feeds_set_updated_at on public.rss_feeds;
create trigger rss_feeds_set_updated_at
before update on public.rss_feeds
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.rss_feeds enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "rss_feeds_select_own" on public.rss_feeds;
create policy "rss_feeds_select_own"
on public.rss_feeds
for select
using (auth.uid() = user_id);

drop policy if exists "rss_feeds_insert_own" on public.rss_feeds;
create policy "rss_feeds_insert_own"
on public.rss_feeds
for insert
with check (auth.uid() = user_id);

drop policy if exists "rss_feeds_update_own" on public.rss_feeds;
create policy "rss_feeds_update_own"
on public.rss_feeds
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "rss_feeds_delete_own" on public.rss_feeds;
create policy "rss_feeds_delete_own"
on public.rss_feeds
for delete
using (auth.uid() = user_id);
