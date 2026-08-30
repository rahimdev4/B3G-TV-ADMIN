import { importLegacyDrafts } from "@/app/actions/import-legacy";
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
};

export default async function ImportLegacyPage({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [showsResult, videosResult, importedResult] = await Promise.all([
    supabase.from("shows").select("id,title,thumbnail_url,created_at").order("created_at"),
    supabase.from("videos").select("id,show_id,title,description,video_url,thumbnail_url,type,is_featured,is_free,created_at").order("created_at"),
    supabase.from("cms_titles").select("legacy_show_id").is("deleted_at", null).not("legacy_show_id", "is", null),
  ]);
  const shows = (showsResult.data ?? []) as LegacyShow[];
  const videos = (videosResult.data ?? []) as LegacyVideo[];
  const importedIds = new Set((importedResult.data ?? []).map((item) => item.legacy_show_id));
  const loadError = showsResult.error ?? videosResult.error ?? importedResult.error;
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
    {query.success === "imported" && <div className="alert success">Safe import completed: {query.titles ?? "0"} new titles, {query.seasons ?? "0"} new seasons and {query.episodes ?? "0"} new episodes. Existing imported records were skipped.</div>}

    <section className="legacy-summary">
      <article><span>Movies</span><strong>{plans.filter((item) => item.type === "movie").length}</strong></article>
      <article><span>Shows</span><strong>{plans.filter((item) => item.type === "show").length}</strong></article>
      <article><span>Media references</span><strong>{videos.length + new Set(shows.map((show) => show.thumbnail_url).filter(Boolean)).size}</strong></article>
      <article><span>Already imported</span><strong>{plans.filter((item) => item.imported).length}</strong></article>
    </section>

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
