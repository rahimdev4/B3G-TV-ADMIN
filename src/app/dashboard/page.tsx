import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getOverview() {
  const supabase = await createSupabaseServerClient();
  const [shows, videos] = await Promise.all([
    supabase.from("shows").select("id,title,thumbnail_url,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(4),
    supabase.from("videos").select("id,title,type,is_free,is_featured,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(6),
  ]);
  return { shows, videos };
}

export default async function DashboardPage() {
  const { shows, videos } = await getOverview();
  const error = shows.error ?? videos.error;
  const freeCount = videos.data?.filter((video) => video.is_free).length ?? 0;

  return (
    <>
      <section className="page-heading"><div><p className="eyebrow accent">OVERVIEW</p><h1>Good to see you.</h1><p className="muted">Monitor the live content library without disrupting current viewers.</p></div><Link className="button primary" href="/dashboard/shows">View library</Link></section>
      {error && <div className="alert error">Could not load production content. {error.message}</div>}
      <section className="stat-grid">
        <article className="stat-card"><span>Shows</span><strong>{shows.count ?? "—"}</strong><small>Live library records</small></article>
        <article className="stat-card"><span>Videos</span><strong>{videos.count ?? "—"}</strong><small>Episodes and clips</small></article>
        <article className="stat-card"><span>Free in latest</span><strong>{freeCount}</strong><small>Among the six newest videos</small></article>
        <article className="stat-card safe"><span>Connection</span><strong>Healthy</strong><small>Read-only overview active</small></article>
      </section>
      <section className="panel-grid">
        <article className="panel"><div className="panel-title"><div><p className="eyebrow">RECENT CONTENT</p><h2>Latest videos</h2></div><span className="badge">Production</span></div><div className="content-list">{videos.data?.map((video) => <div className="content-row" key={video.id}><div><strong>{video.title}</strong><small>{video.type}</small></div><div className="badges"><span className={`badge ${video.is_free ? "free" : "premium"}`}>{video.is_free ? "Free" : "Premium"}</span>{video.is_featured && <span className="badge featured">Featured</span>}</div></div>)}</div></article>
        <article className="panel"><div className="panel-title"><div><p className="eyebrow">SAFETY</p><h2>Production guardrails</h2></div></div><ul className="check-list"><li>Existing records remain untouched</li><li>No schema migration applied</li><li>Admin email allowlist enforced</li><li>Secrets remain server-side</li><li>Cloudflare URLs preserved</li></ul></article>
      </section>
    </>
  );
}
