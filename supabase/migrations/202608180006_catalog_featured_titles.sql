alter table public.cms_titles add column if not exists is_featured boolean not null default false;
alter table public.catalog_titles add column if not exists is_featured boolean not null default false;
create index if not exists catalog_titles_featured_sort_idx on public.catalog_titles(is_featured, sort_order) where is_published;
