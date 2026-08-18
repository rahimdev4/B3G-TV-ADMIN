import { archiveMediaAsset } from "@/app/actions/media";
import { ImageUploader } from "@/components/image-uploader";
import { MediaPreviewCard } from "@/components/media-preview-card";
import { StreamUploader } from "@/components/stream-uploader";
import { requireAdmin } from "@/lib/auth";

const errors: Record<string, string> = { asset_in_use: "This asset is assigned to staged content and cannot be archived.", delete_failed: "The media record could not be archived." };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: assets, error: loadError }, { data: titles }, { data: seasons }, { data: episodes }] = await Promise.all([
    supabase.from("cms_media_assets").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("cms_titles").select("title,content_type,poster_asset_id,thumbnail_asset_id,trailer_asset_id,video_asset_id").is("deleted_at", null),
    supabase.from("cms_seasons").select("title,season_number,thumbnail_asset_id,cms_titles!cms_seasons_show_id_fkey(title)").is("deleted_at", null),
    supabase.from("cms_episodes").select("title,episode_number,thumbnail_asset_id,trailer_asset_id,video_asset_id,cms_titles!cms_episodes_show_id_fkey(title)").is("deleted_at", null),
  ]);

  function assignmentsFor(assetId: string) {
    const uses: string[] = [];
    titles?.forEach((item) => {
      const label = `${item.content_type === "movie" ? "Movie" : "Show"}: ${item.title}`;
      if (item.poster_asset_id === assetId) uses.push(`${label} — poster`);
      if (item.thumbnail_asset_id === assetId) uses.push(`${label} — thumbnail`);
      if (item.trailer_asset_id === assetId) uses.push(`${label} — trailer`);
      if (item.video_asset_id === assetId) uses.push(`${label} — main video`);
    });
    seasons?.forEach((item) => {
      if (item.thumbnail_asset_id === assetId) uses.push(`Season: ${item.cms_titles?.[0]?.title ?? "Show"} S${item.season_number}${item.title ? ` — ${item.title}` : ""} — thumbnail`);
    });
    episodes?.forEach((item) => {
      const label = `Episode: ${item.cms_titles?.[0]?.title ?? "Show"} E${item.episode_number} — ${item.title}`;
      if (item.thumbnail_asset_id === assetId) uses.push(`${label} — thumbnail`);
      if (item.trailer_asset_id === assetId) uses.push(`${label} — trailer`);
      if (item.video_asset_id === assetId) uses.push(`${label} — main video`);
    });
    return uses;
  }

  return <>
    <section className="page-heading"><div><p className="eyebrow accent">CLOUDFLARE</p><h1>Media library</h1><p className="muted">Preview quality, playback, live processing state, delivery, and content assignments.</p></div></section>
    {error && <div className="alert error">{errors[error] ?? "Media action failed."}</div>}{success && <div className="alert success">Media archived safely.</div>}{loadError && <div className="alert error">Could not load staged media.</div>}
    <ImageUploader /><StreamUploader />
    <section className="media-grid">{assets?.map((asset) => <MediaPreviewCard key={asset.id} asset={asset} assignments={assignmentsFor(asset.id)} archiveAction={archiveMediaAsset} />)}{!assets?.length && <div className="empty-state media-empty"><div className="empty-icon">+</div><h2>No staged media yet</h2><p className="muted">Upload the first thumbnail or video above.</p></div>}</section>
  </>;
}
