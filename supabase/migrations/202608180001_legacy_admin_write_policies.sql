-- Applied to production on 2026-08-18 as migration legacy_admin_write_policies.
-- Grants INSERT/UPDATE only to the named CMS admin. DELETE is not granted.

drop policy if exists "Legacy shows admin insert" on public.shows;
create policy "Legacy shows admin insert" on public.shows for insert to authenticated
with check ((auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com');

drop policy if exists "Legacy shows admin update" on public.shows;
create policy "Legacy shows admin update" on public.shows for update to authenticated
using ((auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com')
with check ((auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com');

drop policy if exists "Legacy videos admin insert" on public.videos;
create policy "Legacy videos admin insert" on public.videos for insert to authenticated
with check ((auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com');

drop policy if exists "Legacy videos admin update" on public.videos;
create policy "Legacy videos admin update" on public.videos for update to authenticated
using ((auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com')
with check ((auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com');
