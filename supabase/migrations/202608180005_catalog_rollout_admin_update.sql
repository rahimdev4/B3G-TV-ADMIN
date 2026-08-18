drop policy if exists "Catalog V2 rollout admin update" on public.app_config;
create policy "Catalog V2 rollout admin update" on public.app_config for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email',''))='b3gtvapp@gmail.com' and key='catalog_v2_enabled')
with check (lower(coalesce(auth.jwt() ->> 'email',''))='b3gtvapp@gmail.com' and key='catalog_v2_enabled');
