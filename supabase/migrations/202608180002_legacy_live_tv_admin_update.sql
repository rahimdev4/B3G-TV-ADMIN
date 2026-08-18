-- Allows only the named CMS admin to update the existing Live TV configuration.
-- No INSERT or DELETE permission is granted.

drop policy if exists "Legacy Live TV admin update" on public.app_config;
create policy "Legacy Live TV admin update"
on public.app_config for update
to authenticated
using (
  (auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com'
  and key = 'live_tv_url'
)
with check (
  (auth.jwt() ->> 'email') = 'b3gtvapp@gmail.com'
  and key = 'live_tv_url'
);
