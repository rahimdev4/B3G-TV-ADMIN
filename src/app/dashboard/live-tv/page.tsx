import { updateLiveTvUrl } from "@/app/actions/app-config";
import { requireAdmin } from "@/lib/auth";
import { legacyWritesEnabled } from "@/lib/env";

type Query = Promise<{ error?: string; success?: string }>;

const errors: Record<string, string> = {
  writes_locked: "Production configuration writes are locked by the server.",
  confirmation_required: "Type LIVE before changing the customer-visible stream.",
  invalid_url: "Enter a valid HTTPS Live TV stream URL.",
  save_failed: "The Live TV URL was not changed.",
};

export default async function LiveTvPage({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const writesEnabled = legacyWritesEnabled();
  const { data: liveTv, error } = await supabase
    .from("app_config")
    .select("key,value,updated_at")
    .eq("key", "live_tv_url")
    .maybeSingle();

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow accent">SHARED PRODUCTION CONFIGURATION</p>
          <h1>Live TV</h1>
          <p className="muted">One stream setting shared by current and future B3GTV applications.</p>
        </div>
        <span className={`legacy-write-state ${writesEnabled ? "enabled" : "locked"}`}>
          {writesEnabled ? "LIVE WRITES ENABLED" : "READ-ONLY SAFETY LOCK"}
        </span>
      </section>

      <div className="alert legacy-warning"><strong>Saving a new URL can switch the channel immediately for connected viewers.</strong> Verify the HLS stream before changing this value.</div>
      {!writesEnabled && <div className="alert safe-lock">Safe mode is active. The form and server-side mutation are locked.</div>}
      {error && <div className="alert error">Could not load Live TV configuration. {error.message}</div>}
      {query.error && <div className="alert error">{errors[query.error] ?? "Live TV action failed."}</div>}
      {query.success === "updated" && <div className="alert success">Live TV URL updated. Connected app sessions receive the new value through Supabase Realtime.</div>}

      <section className="panel live-tv-editor standalone-live-tv">
        <div className="live-tv-current">
          <p className="eyebrow">CURRENT STREAM</p>
          <code>{liveTv?.value ?? "Missing live_tv_url row"}</code>
          <small>{liveTv?.updated_at ? `Last changed ${new Date(liveTv.updated_at).toLocaleString()}` : "No update timestamp available"}</small>
          <ul className="check-list live-tv-checks">
            <li>Used by the existing Live TV tab</li>
            <li>Realtime updates are enabled in Flutter</li>
            <li>HTTPS URLs only</li>
            <li>No delete operation is available</li>
          </ul>
        </div>
        <form action={updateLiveTvUrl} className="form-panel">
          <div><p className="eyebrow">CHANGE STREAM</p><h2>Update Live TV URL</h2></div>
          <fieldset disabled={!writesEnabled || !liveTv}>
            <label>New HLS URL<input name="live_tv_url" type="url" defaultValue={liveTv?.value ?? ""} required placeholder="https://.../index.m3u8" /></label>
            <label className="live-confirm">Type LIVE to confirm<input name="live_confirmation" required autoComplete="off" /></label>
            <button className="button danger" type="submit">Update Live TV now</button>
          </fieldset>
        </form>
      </section>
    </>
  );
}
