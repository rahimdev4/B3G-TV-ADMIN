# B3GTV Admin CMS

Local-first Next.js admin panel for the production B3GTV content library.

## Safety status

- Existing `shows` and `videos` are managed only from the separately labeled
  Legacy App page. Writes require both the admin identity and
  `ENABLE_LEGACY_WRITES=true`; no legacy delete policy exists.
- No production migration is applied by this project automatically.
- CMS access requires both Supabase authentication and the `ADMIN_EMAILS` allowlist.
- Service-role and Cloudflare secrets must only exist in `.env.local` or deployment secrets.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the current Supabase anon/publishable key.
3. Keep `ADMIN_EMAILS=b3gtvapp@gmail.com`.
4. Create that user through Supabase Auth and choose a private password.
5. Run `npm install`, then `npm run dev`.

Cloudflare settings can remain blank until upload work begins.

## Production

Production preparation and the exact Vercel/GoDaddy sequence are documented in
`docs/production-deployment-checklist.md`. Do not commit `.env.local`, and do
not add a Supabase service-role key because this application does not use one.
