# Production compatibility plan

## Current live contract

Released B3GTV clients read every row from `shows` and `videos`. They do not yet
filter on publish state. The fields below must remain available:

- `shows`: `id`, `title`, `thumbnail_url`, `created_at`
- `videos`: `id`, `show_id`, `title`, `description`, `video_url`,
  `thumbnail_url`, `type`, `is_featured`, `is_free`, `created_at`

Cloudflare is already the active media provider:

- Images: `https://imagedelivery.net/...`
- Stream: `https://customer-fppmoaty1dlbvn70.cloudflarestream.com/...`

## Safe rollout

1. Build and test CMS reads locally against production.
2. Test the additive migration on a local database or Supabase branch.
3. Add authenticated admin-only write policies.
4. Add draft staging so unpublished records never enter legacy live tables.
5. Add publish synchronization into the legacy contract.
6. Release a backward-compatible mobile update that understands publish state,
   seasons, ordering, and movies.
7. Keep legacy fields populated for older installed app versions.

## Movie representation

A movie is represented by a `shows` row with `content_type = 'movie'` and one
associated playable `videos` row. This preserves the foreign-key and playback
contract used by current apps. New clients can present it as a standalone movie;
old clients continue to see a playable content item without crashing.

## Destructive actions

CMS deletion will be soft deletion (`deleted_at`) plus unpublish. Hard deletion
of production content is not part of the normal UI and must require a separate,
explicit maintenance operation.
