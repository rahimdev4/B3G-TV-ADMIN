import { publishTitle, unpublishTitle } from "@/app/actions/publishing";
import { requireAdmin } from "@/lib/auth";
import { databaseErrorMessages } from "@/lib/database-errors";

type Query = Promise<{ error?: string; success?: string; ready?: string }>;
const errors: Record<string, string> = {
  ...databaseErrorMessages,
  publish_confirmation: "Type PUBLISH to confirm.",
  publish_failed: "Publishing failed because of an unexpected database error. Please try again.",
  media_not_ready: "Assigned trailer or main video is still processing. Open Media, then Preview & status to synchronize Cloudflare readiness.",
  main_video_required: "A movie requires an assigned main video.",
  title_not_ready: "Set the title workflow to Ready before publishing.",
  unpublish_confirmation: "Type UNPUBLISH to confirm.",
  unpublish_failed: "Unpublishing failed.",
};

const sameIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id) => right.includes(id));

export default async function PublishingPage({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: titles }, { data: published }, { data: seasons }, { data: episodes }, { data: publishedSeasons }, { data: publishedEpisodes }] = await Promise.all([
    supabase.from("cms_titles").select("id,title,content_type,workflow_status,is_free,updated_at").is("deleted_at", null).order("sort_order"),
    supabase.from("catalog_titles").select("id,is_published,published_at,updated_at"),
    supabase.from("cms_seasons").select("id,show_id,workflow_status,updated_at").is("deleted_at", null),
    supabase.from("cms_episodes").select("id,show_id,workflow_status,updated_at").is("deleted_at", null),
    supabase.from("catalog_seasons").select("id,show_id,updated_at").eq("is_published", true),
    supabase.from("catalog_episodes").select("id,show_id,updated_at").eq("is_published", true),
  ]);
  const publication = new Map(published?.map((item) => [item.id, item]));

  const pendingFor = (title: NonNullable<typeof titles>[number]) => {
    const live = publication.get(title.id);
    if (!live?.is_published) return false;
    if (new Date(title.updated_at).getTime() > new Date(live.updated_at).getTime()) return true;
    if (title.content_type !== "show") return false;
    const readySeasonIds = (seasons ?? []).filter((item) => item.show_id === title.id && item.workflow_status === "ready").map((item) => item.id);
    const liveSeasonIds = (publishedSeasons ?? []).filter((item) => item.show_id === title.id).map((item) => item.id);
    const readyEpisodeIds = (episodes ?? []).filter((item) => item.show_id === title.id && item.workflow_status === "ready").map((item) => item.id);
    const liveEpisodeIds = (publishedEpisodes ?? []).filter((item) => item.show_id === title.id).map((item) => item.id);
    if (!sameIds(readySeasonIds, liveSeasonIds) || !sameIds(readyEpisodeIds, liveEpisodeIds)) return true;
    return [...(seasons ?? []), ...(episodes ?? [])]
      .filter((item) => item.show_id === title.id)
      .some((item) => new Date(item.updated_at).getTime() > new Date(live.updated_at).getTime());
  };

  return <>
    <section className="page-heading"><div><p className="eyebrow accent">NEW APP CATALOG</p><h1>Publishing</h1><p className="muted">Ready seasons and episodes automatically flag their parent show for republishing. Legacy shows/videos are never modified here.</p></div></section>
    <div className="alert safe-lock"><strong>Safe separation:</strong> these controls write only to catalog_* tables.</div>
    {query.ready && <div className="alert success">Episode is Ready. Republish its parent show below to send it to the app.</div>}
    {query.error && <div className="alert error">{errors[query.error] ?? "Publishing action failed."}</div>}
    {query.success === "published" && <div className="alert success">Published to the new app catalog.</div>}
    {query.success === "unpublished" && <div className="alert success">Unpublished from the new app catalog.</div>}
    <section className="panel"><div className="record-list">
      {titles?.map((item) => {
        const live = publication.get(item.id)?.is_published === true;
        const pending = pendingFor(item);
        return <div className="record publishing-record" key={item.id}>
          <div><strong>{item.title}</strong><small>{item.content_type} · {item.workflow_status} · {item.is_free ? "Free" : "Premium"}{pending ? " · Ready child changes waiting" : ""}</small></div>
          <span className={`badge ${pending ? "premium" : live ? "free" : "premium"}`}>{pending ? "Republish required" : live ? "Published" : "Not published"}</span>
          {pending ? <form action={publishTitle}><input name="id" type="hidden" value={item.id}/><input name="publish_confirmation" required placeholder="Type PUBLISH"/><button className="button primary">Republish changes</button></form> : <form action={live ? unpublishTitle : publishTitle}><input name="id" type="hidden" value={item.id}/><input name="publish_confirmation" required placeholder={live ? "Type UNPUBLISH" : "Type PUBLISH"}/><button className={`button ${live ? "ghost" : "primary"}`} disabled={!live && item.workflow_status !== "ready"}>{live ? "Unpublish" : "Publish"}</button></form>}
        </div>;
      })}
    </div></section>
  </>;
}
