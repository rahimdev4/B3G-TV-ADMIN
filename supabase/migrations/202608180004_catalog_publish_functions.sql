-- Transactional publishing from private cms_* drafts into public catalog_*.
-- This function never references or mutates legacy shows/videos.

create or replace function public.cms_publish_title(p_title_id uuid)
returns jsonb
language plpgsql
set search_path = public, auth
as $$
declare
  v_title public.cms_titles%rowtype;
  v_seasons integer := 0;
  v_episodes integer := 0;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'b3gtvapp@gmail.com' then
    raise exception 'Admin authorization required';
  end if;

  select * into v_title from public.cms_titles
  where id = p_title_id and deleted_at is null;
  if not found then raise exception 'CMS title not found'; end if;
  if v_title.workflow_status <> 'ready' then raise exception 'Title must be Ready before publishing'; end if;
  if v_title.content_type = 'movie' and v_title.video_asset_id is null then raise exception 'Movie requires a main video'; end if;
  if exists (
    select 1 from public.cms_media_assets a
    where a.id in (v_title.poster_asset_id, v_title.thumbnail_asset_id, v_title.trailer_asset_id, v_title.video_asset_id)
      and (a.deleted_at is not null or a.status <> 'ready')
  ) then raise exception 'Assigned title media must be ready'; end if;

  if v_title.category_id is not null then
    insert into public.catalog_categories(id,name,slug,description,sort_order,is_published,updated_at)
    select id,name,slug,description,sort_order,true,now() from public.cms_categories
    where id=v_title.category_id and deleted_at is null and is_active
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,sort_order=excluded.sort_order,is_published=true,updated_at=now();
  end if;

  insert into public.catalog_titles(id,content_type,title,slug,description,category_id,poster_url,thumbnail_url,trailer_url,video_url,is_free,sort_order,is_published,published_at,updated_at)
  select t.id,t.content_type,t.title,t.slug,t.description,t.category_id,
    poster.public_url,thumb.public_url,trailer.public_url,video.public_url,
    t.is_free,t.sort_order,true,coalesce(existing.published_at,now()),now()
  from public.cms_titles t
  left join public.cms_media_assets poster on poster.id=t.poster_asset_id
  left join public.cms_media_assets thumb on thumb.id=t.thumbnail_asset_id
  left join public.cms_media_assets trailer on trailer.id=t.trailer_asset_id
  left join public.cms_media_assets video on video.id=t.video_asset_id
  left join public.catalog_titles existing on existing.id=t.id
  where t.id=p_title_id
  on conflict(id) do update set content_type=excluded.content_type,title=excluded.title,slug=excluded.slug,description=excluded.description,category_id=excluded.category_id,poster_url=excluded.poster_url,thumbnail_url=excluded.thumbnail_url,trailer_url=excluded.trailer_url,video_url=excluded.video_url,is_free=excluded.is_free,sort_order=excluded.sort_order,is_published=true,updated_at=now();

  if v_title.content_type = 'show' then
    if exists (
      select 1 from public.cms_episodes e join public.cms_seasons s on s.id=e.season_id
      left join public.cms_media_assets video on video.id=e.video_asset_id
      where e.show_id=p_title_id and e.deleted_at is null and e.workflow_status='ready'
        and s.deleted_at is null and s.workflow_status='ready'
        and (e.video_asset_id is null or video.status <> 'ready' or video.deleted_at is not null)
    ) then raise exception 'Every ready episode requires ready main video media'; end if;

    insert into public.catalog_seasons(id,show_id,season_number,title,description,thumbnail_url,sort_order,is_published,updated_at)
    select s.id,s.show_id,s.season_number,s.title,s.description,thumb.public_url,s.sort_order,true,now()
    from public.cms_seasons s left join public.cms_media_assets thumb on thumb.id=s.thumbnail_asset_id
    where s.show_id=p_title_id and s.deleted_at is null and s.workflow_status='ready'
    on conflict(id) do update set season_number=excluded.season_number,title=excluded.title,description=excluded.description,thumbnail_url=excluded.thumbnail_url,sort_order=excluded.sort_order,is_published=true,updated_at=now();
    get diagnostics v_seasons = row_count;

    update public.catalog_seasons set is_published=false,updated_at=now()
    where show_id=p_title_id and id not in (select id from public.cms_seasons where show_id=p_title_id and deleted_at is null and workflow_status='ready');

    insert into public.catalog_episodes(id,show_id,season_id,episode_number,title,slug,description,thumbnail_url,trailer_url,video_url,duration_sec,is_free,sort_order,is_published,published_at,updated_at)
    select e.id,e.show_id,e.season_id,e.episode_number,e.title,e.slug,e.description,thumb.public_url,trailer.public_url,video.public_url,e.duration_sec,e.is_free,e.sort_order,true,coalesce(existing.published_at,now()),now()
    from public.cms_episodes e
    join public.cms_seasons s on s.id=e.season_id and s.deleted_at is null and s.workflow_status='ready'
    left join public.cms_media_assets thumb on thumb.id=e.thumbnail_asset_id
    left join public.cms_media_assets trailer on trailer.id=e.trailer_asset_id
    left join public.cms_media_assets video on video.id=e.video_asset_id
    left join public.catalog_episodes existing on existing.id=e.id
    where e.show_id=p_title_id and e.deleted_at is null and e.workflow_status='ready'
    on conflict(id) do update set season_id=excluded.season_id,episode_number=excluded.episode_number,title=excluded.title,slug=excluded.slug,description=excluded.description,thumbnail_url=excluded.thumbnail_url,trailer_url=excluded.trailer_url,video_url=excluded.video_url,duration_sec=excluded.duration_sec,is_free=excluded.is_free,sort_order=excluded.sort_order,is_published=true,updated_at=now();
    get diagnostics v_episodes = row_count;

    update public.catalog_episodes set is_published=false,updated_at=now()
    where show_id=p_title_id and id not in (select id from public.cms_episodes where show_id=p_title_id and deleted_at is null and workflow_status='ready');
  end if;
  return jsonb_build_object('title_id',p_title_id,'seasons',v_seasons,'episodes',v_episodes);
end;
$$;

create or replace function public.cms_unpublish_title(p_title_id uuid)
returns void language plpgsql set search_path = public, auth as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'b3gtvapp@gmail.com' then raise exception 'Admin authorization required'; end if;
  update public.catalog_titles set is_published=false,updated_at=now() where id=p_title_id;
  update public.catalog_seasons set is_published=false,updated_at=now() where show_id=p_title_id;
  update public.catalog_episodes set is_published=false,updated_at=now() where show_id=p_title_id;
end;
$$;

revoke all on function public.cms_publish_title(uuid) from public, anon;
revoke all on function public.cms_unpublish_title(uuid) from public, anon;
grant execute on function public.cms_publish_title(uuid), public.cms_unpublish_title(uuid) to authenticated;
