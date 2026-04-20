create extension if not exists pgcrypto;

create table if not exists public.authors_curated_feeds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists authors_curated_feeds_url_key
on public.authors_curated_feeds (url);

drop trigger if exists authors_curated_feeds_set_updated_at on public.authors_curated_feeds;
create trigger authors_curated_feeds_set_updated_at
before update on public.authors_curated_feeds
for each row
execute function public.handle_updated_at();

alter table public.authors_curated_feeds enable row level security;

drop policy if exists "authors_curated_feeds_select_all_authenticated"
on public.authors_curated_feeds;
create policy "authors_curated_feeds_select_all_authenticated"
on public.authors_curated_feeds
for select
to authenticated
using (true);
