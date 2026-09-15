# CMS database migrations

Migration status is documented per file. `202608170001_cms_isolated_staging.sql`
has been applied to Supabase and creates only isolated `cms_*` tables.

Production safety rules:

1. Existing `public.shows` and `public.videos` rows are real live content.
2. Existing columns are never renamed or removed.
3. Existing rows receive backward-compatible defaults (`is_published = true`).
4. Draft content must not be inserted into legacy `shows`/`videos` while released
   mobile versions still query those tables without a publish filter.
5. Apply a migration only after reviewing it against a Supabase development branch
   or local database and confirming mobile compatibility.

No migration in this directory alters, updates, deletes, or inserts content in the
production `shows` or `videos` tables.

`202608180001_legacy_admin_write_policies.sql` was applied on 2026-08-18. It
grants only the allowlisted admin INSERT/UPDATE access; no DELETE policy exists.
The local application gate `ENABLE_LEGACY_WRITES` still controls whether the
Legacy App Manager exposes mutation forms.

`202608180002_legacy_live_tv_admin_update.sql` was also applied on 2026-08-18.
It permits the allowlisted admin to update only `app_config.live_tv_url`; it
does not grant INSERT or DELETE access.

`202609150001_catalog_trailer_only_movies_NOT_APPLIED.sql` is **not applied**.
It replaces only the admin-only `cms_publish_title` function to permit Catalog
V2 movies with a Ready trailer and no main video. It does not change tables,
existing rows, or the legacy `shows`/`videos` catalog. Apply this SQL in
Supabase before trying to publish trailer-only movies from the production CMS.
