import { importLegacyDrafts } from "@/app/actions/import-legacy";
import { resetCmsTestData } from "@/app/actions/reset-cms-test-data";
import { requireAdmin } from "@/lib/auth";
import { databaseErrorMessages } from "@/lib/database-errors";
import { isLegacyTrailer, legacyContentType, type LegacyShow, type LegacyVideo } from "@/lib/legacy-import";

type Query = Promise<{ error?: string; success?: string; titles?: string; seasons?: string; episodes?: string }>;

const errors: Record<string, string> = {
  ...databaseErrorMessages,
  confirmation_required: "Type IMPORT DRAFTS exactly before starting the safe import.",
  invalid_legacy_url: "A legacy Cloudflare URL could not be recognized. Nothing in the live catalog was changed.",
  archived_media_conflict: "A required Cloudflare asset was previously archived in the CMS. Restore or review that media before importing.",
  load_failed: "The legacy inventory could not be loaded from Supabase. Please try again.",
  import_failed: "The draft import stopped because a staging record could not be saved. It is safe to run the import again.",
  reset_confirmation_required: "Type RESET CMS TEST DATA exactly before removing the test metadata.",
  imported_content_present: "Cleanup is locked because legacy content has already been imported. This prevents accidental removal of reviewed imports.",
  reset_failed: "The test-data cleanup stopped because Supabase rejected an operation. It is safe to run cleanup again.",
};

export default async function ImportLegacyPage({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [showsResult, videosResult, importedResult, cmsTitlesResult, cmsMediaResult, cmsSeasonsResult, cmsEpisodesResult, catalogTitlesResult] = await Promise.all([
    supabase.from("shows").select("id,title,thumbnail_url,created_at").order("created_at"),
    supabase.from("videos").select("id,show_id,title,description,video_url,thumbnail_url,type,is_featured,is_free,created_at").order("created_at"),
    supabase.from("cms_titles").select("legacy_show_id").is("deleted_at", null).not("legacy_show_id", "is", null),
    supabase.from("cms_titles").select("id", { count: "exact", head: true }),
    supabase.from("cms_media_assets").select("id", { count: "exact", head: true }),
    supabase.from("cms_seasons").select("id", { count: "exact", head: true }),
    supabase.from("cms_episodes").select("id", { count: "exact", head: true }),
    supabase.from("catalog_titles").select("id", { count: "exact", head: true }),
  ]);
  const shows = (showsResult.data ?? []) as LegacyShow[];
  const videos = (videosResult.data ?? []) as LegacyVideo[];
  const importedIds = new Set((importedResult.data ?? []).map((item) => item.legacy_show_id));
  const loadError = showsResult.error ?? videosResult.error ?? importedResult.error ?? cmsTitlesResult.error ?? cmsMediaResult.error ?? cmsSeasonsResult.error ?? cmsEpisodesResult.error ?? catalogTitlesResult.error;
  const cmsTestRecords = (cmsTitlesResult.count ?? 0) + (cmsMediaResult.count ?? 0) + (cmsSeasonsResult.count ?? 0) + (cmsEpisodesResult.count ?? 0);
  const plans = shows.map((show) => {
    const related = videos.filter((video) => video.show_id === show.id);
    const type = legacyContentType(show, related);
    return {
      show,
      type,
      trailers: related.filter(isLegacyTrailer),
      playable: related.filter((video) => !isLegacyTrailer(video)),
      imported: importedIds.has(show.id),
    };
  });

  return <>
    <section className="page-heading"><div><p className="eyebrow accent">SAFE STAGING MIGRATION</p><h1>Import Legacy Library</h1><p className="muted">Copy the current app inventory into private CMS drafts for review. Live tables and published catalogs are read-only during this operation.</p></div><span className="legacy-write-state locked">DRAFTS ONLY</span></section>
    <div className="alert safe-lock"><strong>Safety guarantee:</strong> this operation inserts only missing records into <code>cms_*</code>. It never updates or deletes <code>shows</code>/<code>videos</code>, never writes to <code>catalog_*</code>, and never publishes content.</div>
    {loadError && <div className="alert error">Could not prepare the import preview: {loadError.message}</div>}
    {query.error && <div className="alert error">{errors[query.error] ?? "The draft import could not be completed."}</div>}
    {query.success === "reset" && <div className="alert success">New CMS test metadata was removed and Catalog V2 was disabled. Legacy content and Cloudflare files were not changed. You can now run the draft import.</div>}
    {query.success === "imported" && <div className="alert success">Safe import completed: {query.titles ?? "0"} new titles, {query.seasons ?? "0"} new seasons and {query.episodes ?? "0"} new episodes. Existing imported records were skipped.</div>}

    <section className="legacy-summary">
      <article><span>Movies</span><strong>{plans.filter((item) => item.type === "movie").length}</strong></article>
      <article><span>Shows</span><strong>{plans.filter((item) => item.type === "show").length}</strong></article>
      <article><span>Media references</span><strong>{videos.length + new Set(shows.map((show) => show.thumbnail_url).filter(Boolean)).size}</strong></article>
      <article><span>Already imported</span><strong>{plans.filter((item) => item.imported).length}</strong></article>
    </section>

    <form action={resetCmsTestData} className="panel form-panel">
      <div><p className="eyebrow">ONE-TIME TEST CLEANUP</p><h2>Reset the new CMS library</h2><p className="muted">Current staging records: {cmsTestRecords}. Published Catalog V2 titles: {catalogTitlesResult.count ?? 0}. This permanently removes new-CMS metadata only. It does not delete Cloudflare files or any legacy/live records.</p></div>
      <label>Type RESET CMS TEST DATA<input name="confirmation" required autoComplete="off" /></label>
      <button className="button danger" type="submit" disabled={Boolean(loadError) || importedIds.size > 0}>Remove Test CMS Metadata</button>
      {importedIds.size > 0 && <small className="muted">Cleanup is automatically locked after a legacy import.</small>}
    </form>

    <section className="panel"><div className="panel-title"><div><p className="eyebrow">IMPORT PREVIEW</p><h2>Exact legacy-to-CMS mapping</h2></div></div><div className="record-list">
      {plans.map(({ show, type, trailers, playable, imported }) => <div className="record static-record" key={show.id}><div><strong>{show.title}</strong><small>{type === "movie" ? "Movies" : "Shows · Season 1"} · {trailers.length} trailer/clip · {playable.length} {type === "movie" ? "main video" : "episode"}{playable.length === 1 ? "" : "s"}</small></div><div className="badges"><span className={`badge ${type === "movie" ? "premium" : "free"}`}>{type}</span><span className={`badge ${imported ? "free" : "premium"}`}>{imported ? "Imported" : "Pending"}</span></div></div>)}
    </div></section>

    <form action={importLegacyDrafts} className="panel form-panel">
      <div><p className="eyebrow">CONFIRM SAFE COPY</p><h2>Import missing records as Draft</h2><p className="muted">The operation is idempotent: running it again skips records already linked by their legacy IDs.</p></div>
      <label>Type IMPORT DRAFTS<input name="confirmation" required autoComplete="off" /></label>
      <button className="button primary" type="submit" disabled={Boolean(loadError)}>Import Legacy Drafts</button>
    </form>
  </>;
}
