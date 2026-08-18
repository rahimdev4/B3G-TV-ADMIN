import {
  createLegacyShow,
  createLegacyVideo,
  updateLegacyLiveTvUrl,
  updateLegacyShow,
  updateLegacyVideo,
} from "@/app/actions/legacy";
import { requireAdmin } from "@/lib/auth";
import { legacyWritesEnabled } from "@/lib/env";

type Query = Promise<{ error?: string; success?: string }>;
type Asset = { id: string; filename: string | null; kind: string; public_url: string };

const errors: Record<string, string> = {
  writes_locked: "Legacy writes are locked by the server. No live content was changed.",
  confirmation_required: "Type LIVE before changing customer-visible content.",
  invalid_show: "A show requires a title and an optional HTTPS thumbnail URL.",
  invalid_video: "Choose a show and provide a title, HTTPS video URL, and valid type.",
  show_save_failed: "The live show was not saved. Database permissions may still be locked.",
  video_save_failed: "The live video was not saved. Database permissions may still be locked.",
  invalid_live_tv_url: "Enter a valid HTTPS Live TV stream URL.",
  live_tv_save_failed: "The Live TV URL was not changed.",
};

const successes: Record<string, string> = {
  show_created: "Live show created.",
  show_updated: "Live show updated.",
  video_created: "Live video created.",
  video_updated: "Live video updated.",
  live_tv_updated: "Live TV URL updated. Connected app sessions receive the new value through Supabase Realtime.",
};

function AssetOptions({ assets, kind }: { assets: Asset[]; kind: "image" | "video" | "trailer" }) {
  return (
    <datalist id={`legacy-${kind}-assets`}>
      {assets.filter((asset) => asset.kind === kind).map((asset) => (
        <option key={asset.id} value={asset.public_url}>{asset.filename ?? asset.id}</option>
      ))}
    </datalist>
  );
}

export default async function LegacyPage({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const writesEnabled = legacyWritesEnabled();
  const [{ data: shows, error: showsError }, { data: videos, error: videosError }, { data: assets }, { data: liveTv, error: liveTvError }] = await Promise.all([
    supabase.from("shows").select("id,title,thumbnail_url,created_at").order("created_at", { ascending: false }),
    supabase.from("videos").select("id,show_id,title,description,video_url,thumbnail_url,type,is_featured,is_free,created_at").order("created_at", { ascending: false }),
    supabase.from("cms_media_assets").select("id,filename,kind,public_url").is("deleted_at", null).eq("status", "ready").order("created_at", { ascending: false }),
    supabase.from("app_config").select("key,value,updated_at").eq("key", "live_tv_url").maybeSingle(),
  ]);
  const showName = new Map(shows?.map((show) => [show.id, show.title]));
  const loadError = showsError ?? videosError ?? liveTvError;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow live-eyebrow">LEGACY APP · PRODUCTION</p>
          <h1>Current Live App</h1>
          <p className="muted">Manage the original <code>shows</code> and <code>videos</code> contract used by installed app versions.</p>
        </div>
        <span className={`legacy-write-state ${writesEnabled ? "enabled" : "locked"}`}>
          {writesEnabled ? "LIVE WRITES ENABLED" : "READ-ONLY SAFETY LOCK"}
        </span>
      </section>

      <div className="alert legacy-warning"><strong>Every successful change here is immediately customer-visible.</strong> New CMS drafts never synchronize here automatically. Deletion is intentionally unavailable.</div>
      {!writesEnabled && <div className="alert safe-lock">Safe development mode is active. Forms are visible for review but disabled, and the server rejects every legacy write.</div>}
      {loadError && <div className="alert error">Could not load live content. {loadError.message}</div>}
      {query.error && <div className="alert error">{errors[query.error] ?? "Legacy action failed."}</div>}
      {query.success && <div className="alert success">{successes[query.success] ?? "Saved."}</div>}

      <AssetOptions assets={(assets ?? []) as Asset[]} kind="image" />
      <AssetOptions assets={(assets ?? []) as Asset[]} kind="video" />
      <AssetOptions assets={(assets ?? []) as Asset[]} kind="trailer" />

      <section className="legacy-summary">
        <article><span>Live shows</span><strong>{shows?.length ?? 0}</strong></article>
        <article><span>Live videos</span><strong>{videos?.length ?? 0}</strong></article>
        <article><span>Episodes</span><strong>{videos?.filter((item) => item.type === "episode").length ?? 0}</strong></article>
        <article><span>Clips</span><strong>{videos?.filter((item) => item.type === "clip").length ?? 0}</strong></article>
      </section>

      <section className="legacy-section">
        <div className="panel-title"><div><p className="eyebrow">LEGACY LIVE TV</p><h2>24/7 stream used by installed apps</h2></div><span className="badge featured">Production</span></div>
        <div className="panel live-tv-editor">
          <div className="live-tv-current">
            <span>Current Supabase value</span>
            <code>{liveTv?.value ?? "Missing live_tv_url row"}</code>
            <small>{liveTv?.updated_at ? `Last changed ${new Date(liveTv.updated_at).toLocaleString()}` : "No update timestamp available"}</small>
          </div>
          <form action={updateLegacyLiveTvUrl} className="form-panel">
            <fieldset disabled={!writesEnabled || !liveTv}>
              <label>New Live TV HLS URL<input name="live_tv_url" type="url" defaultValue={liveTv?.value ?? ""} required placeholder="https://.../index.m3u8" /></label>
              <label className="live-confirm">Type LIVE to confirm<input name="live_confirmation" required autoComplete="off" /></label>
              <button className="button danger" type="submit">Update Live TV for old app</button>
            </fieldset>
          </form>
        </div>
      </section>

      <section className="legacy-section">
        <div className="panel-title"><div><p className="eyebrow">LEGACY SHOWS</p><h2>Customer-visible show containers</h2></div><span className="badge featured">Production</span></div>
        <div className="manage-grid">
          <form action={createLegacyShow} className="panel form-panel">
            <div><p className="eyebrow">NEW LIVE SHOW</p><h2>Create legacy show</h2></div>
            <fieldset disabled={!writesEnabled}>
              <label>Title<input name="title" required maxLength={200} /></label>
              <label>Thumbnail URL<input name="thumbnail_url" type="url" list="legacy-image-assets" placeholder="https://..." /></label>
              <label className="live-confirm">Type LIVE to confirm<input name="live_confirmation" required autoComplete="off" /></label>
              <button className="button danger" type="submit">Create live show</button>
            </fieldset>
          </form>
          <div className="panel"><div className="record-list">
            {shows?.map((show) => (
              <details className="record legacy-record" key={show.id}>
                <summary><div><strong>{show.title}</strong><small>{videos?.filter((video) => video.show_id === show.id).length ?? 0} videos · created {new Date(show.created_at).toLocaleDateString()}</small></div><span className="badge featured">Live</span></summary>
                <form action={updateLegacyShow} className="inline-form">
                  <input name="id" type="hidden" value={show.id} />
                  <fieldset disabled={!writesEnabled}>
                    <label>Title<input name="title" defaultValue={show.title} required /></label>
                    <label>Thumbnail URL<input name="thumbnail_url" type="url" list="legacy-image-assets" defaultValue={show.thumbnail_url ?? ""} /></label>
                    <label className="live-confirm">Type LIVE to confirm<input name="live_confirmation" required autoComplete="off" /></label>
                    <button className="button danger" type="submit">Save to live app</button>
                  </fieldset>
                </form>
              </details>
            ))}
            {!shows?.length && <div className="compact-empty">No live shows returned.</div>}
          </div></div>
        </div>
      </section>

      <section className="legacy-section">
        <div className="panel-title"><div><p className="eyebrow">LEGACY VIDEOS</p><h2>Episodes and clips shown in the current app</h2></div><span className="badge featured">Production</span></div>
        <div className="manage-grid">
          <form action={createLegacyVideo} className="panel form-panel">
            <div><p className="eyebrow">NEW LIVE VIDEO</p><h2>Create episode or clip</h2></div>
            <fieldset disabled={!writesEnabled}>
              <label>Show<select name="show_id" required defaultValue=""><option value="" disabled>Choose live show</option>{shows?.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}</select></label>
              <label>Title<input name="title" required /></label>
              <label>Description<textarea name="description" rows={3} /></label>
              <label>Type<select name="type" defaultValue="episode"><option value="episode">Episode</option><option value="clip">Clip / trailer</option></select></label>
              <label>Video URL<input name="video_url" type="url" list="legacy-video-assets" required placeholder="https://...m3u8" /></label>
              <label>Thumbnail URL<input name="thumbnail_url" type="url" list="legacy-image-assets" placeholder="https://..." /></label>
              <div className="legacy-checks"><label className="check-field"><input name="is_free" type="checkbox" /> Free</label><label className="check-field"><input name="is_featured" type="checkbox" /> Featured</label></div>
              <label className="live-confirm">Type LIVE to confirm<input name="live_confirmation" required autoComplete="off" /></label>
              <button className="button danger" type="submit">Create live video</button>
            </fieldset>
          </form>
          <div className="panel"><div className="record-list">
            {videos?.map((video) => (
              <details className="record legacy-record" key={video.id}>
                <summary><div><strong>{video.title}</strong><small>{showName.get(video.show_id) ?? "Unknown show"} · {video.type}</small></div><div className="badges"><span className={`badge ${video.is_free ? "free" : "premium"}`}>{video.is_free ? "Free" : "Premium"}</span>{video.is_featured && <span className="badge featured">Featured</span>}</div></summary>
                <form action={updateLegacyVideo} className="inline-form legacy-video-form">
                  <input name="id" type="hidden" value={video.id} />
                  <fieldset disabled={!writesEnabled}>
                    <label>Show<select name="show_id" defaultValue={video.show_id} required>{shows?.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}</select></label>
                    <label>Title<input name="title" defaultValue={video.title} required /></label>
                    <label>Description<textarea name="description" defaultValue={video.description ?? ""} rows={3} /></label>
                    <label>Type<select name="type" defaultValue={video.type}><option value="episode">Episode</option><option value="clip">Clip / trailer</option></select></label>
                    <label>Video URL<input name="video_url" type="url" list="legacy-video-assets" defaultValue={video.video_url} required /></label>
                    <label>Thumbnail URL<input name="thumbnail_url" type="url" list="legacy-image-assets" defaultValue={video.thumbnail_url ?? ""} /></label>
                    <div className="legacy-checks"><label className="check-field"><input name="is_free" type="checkbox" defaultChecked={video.is_free} /> Free</label><label className="check-field"><input name="is_featured" type="checkbox" defaultChecked={video.is_featured} /> Featured</label></div>
                    <label className="live-confirm">Type LIVE to confirm<input name="live_confirmation" required autoComplete="off" /></label>
                    <button className="button danger" type="submit">Save to live app</button>
                  </fieldset>
                </form>
              </details>
            ))}
            {!videos?.length && <div className="compact-empty">No live videos returned.</div>}
          </div></div>
        </div>
      </section>
    </>
  );
}
