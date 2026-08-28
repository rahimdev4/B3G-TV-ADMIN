# B3GTV Admin CMS — Client Handover Guide

**Project:** B3GTV Admin CMS  
**Phase:** Phase 3 — Admin CMS  
**Production URL:** [https://admin.b3gtv.com](https://admin.b3gtv.com)  
**Admin account:** `b3gtvapp@gmail.com`  
**Hosting:** Vercel  
**Database and authentication:** Supabase  
**Video hosting:** Cloudflare Stream  
**Image hosting:** Cloudflare Images

## 1. Purpose

The B3GTV Admin CMS allows the authorized B3GTV administrator to manage content without editing the database manually.

The CMS supports:

- Categories
- Movies and shows
- Seasons and episodes
- Images, trailers and main videos
- Free and premium access flags
- Featured home-screen content
- Draft, ready, published and unpublished workflows
- Live TV URL management
- The existing legacy app catalog
- The richer catalog used by updated mobile-app versions

## 2. Signing in

1. Open [https://admin.b3gtv.com](https://admin.b3gtv.com).
2. Sign in with the authorized admin email and its Supabase Auth password.
3. After successful authentication, the dashboard opens automatically.
4. Use **Log out** when administration is finished, especially on a shared device.

Only email addresses configured in the server-side `ADMIN_EMAILS` environment variable may enter the dashboard. A normal Supabase user cannot access the CMS.

The password is intentionally not stored in this repository or document. Reset it through Supabase Authentication if it is lost.

## 3. Important catalog separation

B3GTV currently has two independent content systems:

| System | Managed from | Used by |
|---|---|---|
| Legacy catalog | **Legacy App (Live)** | Older installed app versions |
| Catalog V2 | Categories, Media, Movies, Shows, Seasons & Episodes, Featured and Publishing | Updated app versions |

Publishing Catalog V2 content does **not** automatically change the legacy `shows` or `videos` tables. This separation protects existing users and allows both app versions to continue receiving content.

If the same content must appear in both versions, the administrator must manage it separately in both systems.

## 4. Recommended content workflow

Use this order for new Catalog V2 content:

1. Upload the thumbnail in **Media**.
2. Upload the trailer or main video in **Media** or **Trailers**.
3. Wait until Cloudflare status changes from **Processing** to **Ready**.
4. Open **Preview & status** to confirm the thumbnail and video playback.
5. Create or edit the movie/show.
6. Assign its category, thumbnail, trailer and main video.
7. Choose **Free** or **Premium**.
8. Keep unfinished content as **Draft**.
9. Change completed content to **Ready**.
10. For shows, create seasons and episodes, assign episode media and set completed records to **Ready**.
11. Open **Publishing**.
12. Type `PUBLISH` and publish the title.
13. If a published show receives new or changed seasons/episodes, use **Republish changes**.

Draft content is not copied into the public Catalog V2 tables.

## 5. Media and Cloudflare

### Images

- Upload thumbnails through **Media**.
- Images are uploaded directly to Cloudflare Images through a temporary upload URL.
- The Cloudflare API token remains on the server and is never sent to the browser.
- Preview the image before assigning it to content.

### Videos and trailers

- Upload videos through **Media** and trailers through **Media** or **Trailers**.
- Large uploads use Cloudflare Stream's resumable upload flow.
- A newly uploaded file may show **Processing** while Cloudflare prepares playback.
- The CMS checks Cloudflare status automatically.
- Publish only after required media shows **Ready** and playback works in the preview.

Do not archive Cloudflare media that is still assigned to a movie, show, season or episode. The CMS blocks unsafe archive operations.

## 6. Movies

From **Movies**, the administrator can:

- Create and edit movie metadata
- Select a category
- Assign a thumbnail, trailer and main video
- Set free or premium access
- Set draft or ready workflow status
- Control sort order
- Archive safely

A movie must have its required main video ready before it can be published.

## 7. Shows, seasons and episodes

Create the parent show first, then use **Seasons & Episodes**.

For each season:

- Select the parent show
- Enter the season number and optional title/description
- Assign an optional thumbnail
- Set ordering and workflow status

For each episode:

- Select the correct show and season
- Enter episode number, title and description
- Assign thumbnail, trailer and main video
- Set free or premium access
- Set ordering and workflow status

When a new or edited episode becomes **Ready**, the Publishing page identifies its parent show. Republish that show to update the public Catalog V2 record.

## 8. Featured content

Use **Featured** to choose the movies or shows displayed in the updated app's home-screen featured slider.

After changing the featured selection, republish an already published title so the public catalog receives the updated featured value.

Legacy featured content remains independent and is managed from **Legacy App (Live)**.

## 9. Publishing and unpublishing

### Publish

Publishing copies a validated ready record from private `cms_*` staging tables into public published-only `catalog_*` tables.

- Type `PUBLISH` exactly when asked.
- Required media must be ready.
- Shows publish their ready seasons and episodes together.
- Repeated publishing updates the same catalog records and does not create duplicates.

### Republish

Republish when a published title, season or episode has changed. The CMS labels affected shows as **Republish required**.

### Unpublish

- Type `UNPUBLISH` exactly when asked.
- Unpublishing removes the title from Catalog V2 app queries.
- It does not change legacy content.

## 10. Free and premium behavior

The CMS stores only the `is_free` content flag.

- **Free:** the updated mobile app allows playback without a subscription.
- **Premium:** a locked user is sent to the subscription/paywall flow.

RevenueCat entitlement validation remains inside the mobile app and is not managed by this CMS.

## 11. Live TV

The **Live TV** page manages the shared `app_config.live_tv_url` value.

This setting affects both legacy and updated app versions. Because it is a live production setting:

1. Confirm the new URL is HTTPS and playable.
2. Enter the required `LIVE` confirmation.
3. Save the URL.
4. Test playback in the mobile app immediately.

## 12. Legacy App (Live)

The **Legacy App (Live)** page manages the existing production `shows` and `videos` tables used by older installed app versions.

Safety rules:

- Legacy editing is available only when `ENABLE_LEGACY_WRITES=true` is configured on Vercel.
- Every legacy write requires the exact `LIVE` confirmation.
- There is no legacy delete action.
- Do not modify an existing record unless the change is intended to appear immediately for real users.
- Test URLs and metadata carefully before saving.

Catalog V2 publishing never writes to these legacy tables.

## 13. Catalog V2 rollout

The updated Flutter app reads the `app_config.catalog_v2_enabled` setting:

- `false`: updated builds use the legacy content experience.
- `true`: updated builds use the richer Catalog V2 experience.
- Older app binaries ignore this setting and always use legacy tables.

Use **Catalog Rollout** to change the setting. Enabling requires `ENABLE V2`; disabling requires `DISABLE V2`.

Keep Catalog V2 disabled until the updated iOS and Android builds have been tested and are ready for release. If a catalog problem occurs, disable Catalog V2 to return updated builds to the legacy source.

## 14. Archive and deletion safety

Normal CMS deletion is implemented as a soft archive:

- The record is retained in Supabase.
- A confirmation dialog appears before archiving.
- Dependency checks prevent unsafe archive operations.
- Production legacy content is not hard-deleted.
- Cloudflare assets are not automatically deleted.

Hard deletion of production database rows or Cloudflare assets is a separate maintenance operation and should not be performed from the normal CMS workflow.

## 15. Deployment and environment variables

The admin repository is deployed by Vercel. Pushing to the configured production branch triggers a new deployment.

Required Vercel variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ADMIN_EMAILS
ENABLE_LEGACY_WRITES
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_STREAM_CUSTOMER_CODE
CLOUDFLARE_IMAGES_ACCOUNT_HASH
CLOUDFLARE_IMAGES_VARIANT
```

Rules:

- Never commit `.env.local`.
- Never put the Cloudflare API token in browser code.
- This CMS does not require a Supabase service-role key.
- Store production secrets only in Vercel Environment Variables.
- The `admin.b3gtv.com` DNS record is separate from the main `b3gtv.com` website.

## 16. Security summary

- Supabase Auth protects login.
- A server-side email allowlist restricts access to the authorized administrator.
- Dashboard pages, server actions and upload routes require admin authentication.
- CMS staging tables use Supabase Row Level Security.
- Public clients can read only published Catalog V2 records.
- Cloudflare secrets remain server-side.
- Security headers include CSP, HSTS, frame denial, no-sniff and search-engine blocking.
- Archive operations use confirmation and soft deletion.

## 17. Troubleshooting

### Media remains Processing

Open **Preview & status** and allow the CMS to synchronize the latest Cloudflare state. Refresh after Cloudflare reports the asset as ready.

### Publishing is blocked

Confirm that:

- The title is **Ready**.
- A movie has a main video.
- All assigned required media is **Ready**.
- Ready episodes have playable main videos.

### A new episode does not appear

Set the episode to **Ready**, then open **Publishing** and republish the parent show.

### Updated app still shows legacy content

Check **Catalog Rollout**. Catalog V2 must be enabled for updated builds to use `catalog_*` tables.

### Older app does not show Catalog V2 content

This is expected. Older binaries use only legacy `shows` and `videos`. Add or update content separately through **Legacy App (Live)** when it must also reach older versions.

### Admin access is denied

Confirm that the user is signed into Supabase Auth with an email included in the Vercel `ADMIN_EMAILS` variable. Log out and sign in again after changing authorization settings.

## 18. Rollback

If the updated catalog causes a mobile-app problem:

1. Open **Catalog Rollout**.
2. Type `DISABLE V2`.
3. Disable Catalog V2.
4. Confirm the app has returned to legacy content.

If the admin deployment causes a problem, promote the previous known-good deployment in Vercel.

Do not delete legacy rows, change the main-domain DNS records or remove Cloudflare assets as part of a normal rollback.

## 19. Delivery status

The Phase 3 Admin CMS includes the agreed foundation, content management, Cloudflare integration, publishing workflow, mobile-app catalog connection, production deployment, safety controls and client-tested functionality.

The administrator has completed acceptance testing. Future additions such as subscriber management, analytics, referral tracking, multi-admin roles, payments, DRM, bulk import/export and full audit logging remain outside this order's scope.

