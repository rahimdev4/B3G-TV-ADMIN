# B3GTV Admin production deployment checklist

Target: `https://admin.b3gtv.com`

This deployment uses only the `admin` DNS label. Do not edit the apex (`@`),
`www`, mail, or nameserver records for `b3gtv.com`.

## Before creating the repository

- Run `npm run typecheck`, `npm run lint`, and `npm run build`.
- Confirm `.env.local` is ignored and absent from Git history.
- Push only the contents of `admin-cms` to the separate admin repository.
- Keep the repository private unless the client explicitly chooses otherwise.

## Vercel project

- Import the separate admin repository.
- Framework preset: Next.js.
- Root directory: repository root when only `admin-cms` was pushed.
- Add the variables below to Production, Preview, and Development as needed.
- Never paste secret values into source code or commit them.

Required Vercel variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_EMAILS=b3gtvapp@gmail.com
ENABLE_LEGACY_WRITES=true
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_STREAM_CUSTOMER_CODE
CLOUDFLARE_IMAGES_ACCOUNT_HASH
CLOUDFLARE_IMAGES_VARIANT=public
```

Do not add `SUPABASE_SERVICE_ROLE_KEY`; the CMS does not use it.

## Supabase production checks

- Keep only `b3gtvapp@gmail.com` in `ADMIN_EMAILS`.
- Use a unique password-manager-generated admin password.
- Enable the strongest available password rules and leaked-password protection.
- Disable public user sign-up if the mobile app does not require Supabase Auth
  sign-up. If mobile users use Auth, do not disable it globally.
- Add `https://admin.b3gtv.com` to the permitted Auth URL configuration.
- Verify a normal authenticated user receives no CMS-table write access.

## Domain and GoDaddy DNS

1. Deploy to Vercel and test the generated `*.vercel.app` URL first.
2. In Vercel, add exactly `admin.b3gtv.com` to the admin project.
3. Copy the exact CNAME target Vercel displays for this project.
4. In GoDaddy DNS, add or edit only:
   - Type: `CNAME`
   - Name/Host: `admin`
   - Value/Points to: the exact Vercel-provided target
   - TTL: default
5. Do not modify `@`, `www`, MX, TXT, or nameserver records.
6. Wait for Vercel to show Valid Configuration and provision HTTPS.

Adding this one CNAME does not move or change the main `b3gtv.com` website.

## Post-deployment tests

- Unauthenticated `/dashboard` redirects to `/login`.
- A non-admin Supabase account cannot enter the dashboard or write CMS rows.
- Admin login/logout and session refresh work.
- Image, video, and trailer direct uploads work.
- Media status changes automatically from Processing to Ready.
- Create/edit/archive confirmations work.
- Draft content stays hidden; publish/republish/unpublish works.
- Featured slider, Live TV, seasons, episodes, free content, and premium paywall
  work in the updated Flutter build.
- Legacy management still updates only the old-app tables.
- Browser response headers include CSP, HSTS, frame denial, no-sniff, and
  `X-Robots-Tag: noindex`.

## Rollback

- Vercel: promote the prior known-good deployment.
- Catalog rollout: set `catalog_v2_enabled` to false from Catalog Rollout.
- DNS: remove only the `admin` CNAME if the admin site must be disconnected.
- Never change or delete the main-domain DNS records during admin rollback.
