import { archiveMediaAsset } from "@/app/actions/media";
import { StreamUploader } from "@/components/stream-uploader";
import { requireAdmin } from "@/lib/auth";
import { UpdatedAt } from "@/components/updated-at";

export default async function TrailersPage() {
  const { supabase } = await requireAdmin();
  const { data: trailers } = await supabase.from("cms_media_assets").select("*").eq("kind", "trailer").is("deleted_at", null).order("created_at", { ascending: false });
  return <><section className="page-heading"><div><p className="eyebrow accent">PROMOTIONAL MEDIA</p><h1>Trailers</h1><p className="muted">Upload resumable trailers and assign them to staged movies, shows, or episodes.</p></div></section><StreamUploader defaultKind="trailer" /><section className="panel"><div className="panel-title"><div><p className="eyebrow">STAGED TRAILERS</p><h2>{trailers?.length ?? 0} trailers</h2></div></div><div className="record-list">{trailers?.map((trailer) => <div className="record static-record" key={trailer.id}><div><strong>{trailer.filename ?? trailer.provider_id}</strong><small>{trailer.status} · Cloudflare Stream<UpdatedAt value={trailer.updated_at} /></small></div><form action={archiveMediaAsset}><input name="id" type="hidden" value={trailer.id} /><button className="button danger small-button">Archive</button></form></div>)}{!trailers?.length && <div className="compact-empty">No staged trailers yet.</div>}</div></section></>;
}
