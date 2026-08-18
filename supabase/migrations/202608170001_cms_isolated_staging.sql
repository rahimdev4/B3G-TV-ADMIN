-- Milestone 2 isolated staging schema.
-- Safety guarantee: this migration does not alter, update, insert into, or delete
-- from the production shows/videos tables used by released B3GTV applications.

create table if not exists public.cms_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video', 'trailer')),
  provider text not null default 'cloudflare' check (provider = 'cloudflare'),
  provider_id text not null,
  public_url text not null,
  thumbnail_url text,
  filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  status text not null default 'processing' check (status in ('uploading', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (provider, provider_id)
);

create table if not exists public.cms_titles (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('movie', 'show')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  category_id uuid references public.cms_categories(id) on delete set null,
  poster_asset_id uuid references public.cms_media_assets(id) on delete set null,
  thumbnail_asset_id uuid references public.cms_media_assets(id) on delete set null,
  trailer_asset_id uuid references public.cms_media_assets(id) on delete set null,
  video_asset_id uuid references public.cms_media_assets(id) on delete set null,
  is_free boolean not null default false,
  workflow_status text not null default 'draft' check (workflow_status in ('draft', 'ready', 'archived')),
  sort_order integer not null default 0,
  legacy_show_id uuid,
  legacy_video_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cms_seasons (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.cms_titles(id) on delete restrict,
  season_number integer not null check (season_number > 0),
  title text,
  description text,
  thumbnail_asset_id uuid references public.cms_media_assets(id) on delete set null,
  workflow_status text not null default 'draft' check (workflow_status in ('draft', 'ready', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (show_id, season_number)
);

create table if not exists public.cms_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.cms_titles(id) on delete restrict,
  season_id uuid not null references public.cms_seasons(id) on delete restrict,
  episode_number integer not null check (episode_number > 0),
  title text not null check (char_length(trim(title)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  thumbnail_asset_id uuid references public.cms_media_assets(id) on delete set null,
  trailer_asset_id uuid references public.cms_media_assets(id) on delete set null,
  video_asset_id uuid references public.cms_media_assets(id) on delete set null,
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  is_free boolean not null default false,
  workflow_status text not null default 'draft' check (workflow_status in ('draft', 'ready', 'archived')),
  sort_order integer not null default 0,
  legacy_video_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (season_id, episode_number),
  unique (show_id, slug)
);

create index if not exists cms_categories_active_sort_idx on public.cms_categories(is_active, sort_order) where deleted_at is null;
create index if not exists cms_media_kind_status_idx on public.cms_media_assets(kind, status) where deleted_at is null;
create index if not exists cms_titles_type_status_idx on public.cms_titles(content_type, workflow_status) where deleted_at is null;
create index if not exists cms_titles_category_idx on public.cms_titles(category_id) where deleted_at is null;
create index if not exists cms_seasons_show_sort_idx on public.cms_seasons(show_id, sort_order) where deleted_at is null;
create index if not exists cms_episodes_season_sort_idx on public.cms_episodes(season_id, sort_order) where deleted_at is null;

create or replace function public.cms_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cms_categories_touch_updated_at on public.cms_categories;
create trigger cms_categories_touch_updated_at before update on public.cms_categories for each row execute function public.cms_touch_updated_at();
drop trigger if exists cms_media_assets_touch_updated_at on public.cms_media_assets;
create trigger cms_media_assets_touch_updated_at before update on public.cms_media_assets for each row execute function public.cms_touch_updated_at();
drop trigger if exists cms_titles_touch_updated_at on public.cms_titles;
create trigger cms_titles_touch_updated_at before update on public.cms_titles for each row execute function public.cms_touch_updated_at();
drop trigger if exists cms_seasons_touch_updated_at on public.cms_seasons;
create trigger cms_seasons_touch_updated_at before update on public.cms_seasons for each row execute function public.cms_touch_updated_at();
drop trigger if exists cms_episodes_touch_updated_at on public.cms_episodes;
create trigger cms_episodes_touch_updated_at before update on public.cms_episodes for each row execute function public.cms_touch_updated_at();

alter table public.cms_categories enable row level security;
alter table public.cms_media_assets enable row level security;
alter table public.cms_titles enable row level security;
alter table public.cms_seasons enable row level security;
alter table public.cms_episodes enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['cms_categories','cms_media_assets','cms_titles','cms_seasons','cms_episodes']
  loop
    execute format('drop policy if exists "B3GTV admin manages %s" on public.%I', table_name, table_name);
    execute format(
      'create policy "B3GTV admin manages %s" on public.%I for all to authenticated using (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''b3gtvapp@gmail.com'') with check (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''b3gtvapp@gmail.com'')',
      table_name,
      table_name
    );
  end loop;
end $$;

revoke all on public.cms_categories, public.cms_media_assets, public.cms_titles, public.cms_seasons, public.cms_episodes from anon;
grant select, insert, update, delete on public.cms_categories, public.cms_media_assets, public.cms_titles, public.cms_seasons, public.cms_episodes to authenticated;

comment on table public.cms_titles is 'Isolated CMS staging. Not queried by released B3GTV apps.';
comment on table public.cms_seasons is 'Isolated CMS staging. Not queried by released B3GTV apps.';
comment on table public.cms_episodes is 'Isolated CMS staging. Not queried by released B3GTV apps.';
