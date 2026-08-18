-- Additive published catalog for updated mobile apps.
-- Existing shows/videos/app_config.live_tv_url behavior is unchanged.

create table if not exists public.catalog_categories (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_titles (
  id uuid primary key,
  content_type text not null check (content_type in ('movie', 'show')),
  title text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.catalog_categories(id) on delete set null,
  poster_url text,
  thumbnail_url text,
  trailer_url text,
  video_url text,
  is_free boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_seasons (
  id uuid primary key,
  show_id uuid not null references public.catalog_titles(id) on delete restrict,
  season_number integer not null check (season_number > 0),
  title text,
  description text,
  thumbnail_url text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (show_id, season_number)
);

create table if not exists public.catalog_episodes (
  id uuid primary key,
  show_id uuid not null references public.catalog_titles(id) on delete restrict,
  season_id uuid not null references public.catalog_seasons(id) on delete restrict,
  episode_number integer not null check (episode_number > 0),
  title text not null,
  slug text not null,
  description text,
  thumbnail_url text,
  trailer_url text,
  video_url text,
  duration_sec integer,
  is_free boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, episode_number),
  unique (show_id, slug)
);

create index if not exists catalog_titles_public_sort_idx on public.catalog_titles(content_type, sort_order) where is_published;
create index if not exists catalog_seasons_public_sort_idx on public.catalog_seasons(show_id, sort_order) where is_published;
create index if not exists catalog_episodes_public_sort_idx on public.catalog_episodes(season_id, sort_order) where is_published;

alter table public.catalog_categories enable row level security;
alter table public.catalog_titles enable row level security;
alter table public.catalog_seasons enable row level security;
alter table public.catalog_episodes enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['catalog_categories','catalog_titles','catalog_seasons','catalog_episodes'] loop
    execute format('drop policy if exists "Published catalog read %s" on public.%I', table_name, table_name);
    execute format('create policy "Published catalog read %s" on public.%I for select to anon, authenticated using (is_published = true)', table_name, table_name);
    execute format('drop policy if exists "B3GTV admin manages %s" on public.%I', table_name, table_name);
    execute format('create policy "B3GTV admin manages %s" on public.%I for all to authenticated using (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''b3gtvapp@gmail.com'') with check (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''b3gtvapp@gmail.com'')', table_name, table_name);
  end loop;
end $$;

grant select on public.catalog_categories, public.catalog_titles, public.catalog_seasons, public.catalog_episodes to anon;
grant select, insert, update, delete on public.catalog_categories, public.catalog_titles, public.catalog_seasons, public.catalog_episodes to authenticated;

insert into public.app_config(key, value)
values ('catalog_v2_enabled', 'false')
on conflict (key) do nothing;

comment on table public.catalog_titles is 'Published rich catalog for updated B3GTV apps. Legacy apps continue using shows/videos.';
