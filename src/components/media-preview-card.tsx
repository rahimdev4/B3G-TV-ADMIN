"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Asset = { id: string; kind: "image" | "video" | "trailer"; provider_id: string; public_url: string; thumbnail_url: string | null; filename: string | null; status: string; size_bytes: number | null; created_at: string };
type LiveStatus = { type: string; state: string; ready: boolean; progress?: string | null; error?: string | null; durationSec?: number | null; sizeBytes?: number | null; width?: number | null; height?: number | null; deliveryURL: string; dashURL?: string | null; thumbnailURL?: string | null; embedURL?: string; variants?: string[]; uploadedAt?: string | null; signed?: boolean };

const bytes = (value?: number | null) => !value ? "—" : value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(2)} GB` : value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`;
const duration = (value?: number | null) => !value ? "—" : `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, "0")}`;

export function MediaPreviewCard({ asset, assignments, archiveAction }: { asset: Asset; assignments: string[]; archiveAction: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [displayStatus, setDisplayStatus] = useState(asset.status);
  const [error, setError] = useState("");

  useEffect(() => {
    if (asset.kind === "image" || displayStatus === "ready" || displayStatus === "failed") return;
    let active = true;
    async function synchronize() {
      try {
        const response = await fetch(`/api/cloudflare/media-status/${asset.id}`, { cache: "no-store" });
        const body = await response.json() as LiveStatus & { error?: string };
        if (!response.ok) return;
        if (!active) return;
        setStatus(body);
        setDisplayStatus(body.ready ? "ready" : body.state === "error" ? "failed" : "processing");
      } catch { /* The visible card stays Processing and retries. */ }
    }
    void synchronize();
    const timer = window.setInterval(synchronize, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [asset.id, asset.kind, displayStatus]);

  async function inspect() {
    setOpen(true); setLoading(true); setError("");
    try {
      const response = await fetch(`/api/cloudflare/media-status/${asset.id}`, { cache: "no-store" });
      const body = await response.json() as LiveStatus & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Status check failed.");
      setStatus(body);
      setDisplayStatus(body.ready ? "ready" : body.state === "error" ? "failed" : "processing");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Status check failed."); }
    finally { setLoading(false); }
  }

  const previewImage = asset.kind === "image" ? asset.public_url : asset.thumbnail_url;
  return <>
    <article className="media-card">
      {previewImage ? <Image src={previewImage} alt={asset.filename ?? "Cloudflare media"} width={480} height={270} unoptimized /> : <div className="media-placeholder">{asset.kind}</div>}
      <div className="media-meta"><div><strong>{asset.filename ?? asset.provider_id}</strong><small>{asset.kind} · {assignments.length ? `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}` : "Unassigned"} · Added {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(asset.created_at))}</small></div><span className={`badge ${displayStatus === "ready" ? "free" : "premium"}`}><span className={`status-light ${displayStatus}`} />{displayStatus === "ready" ? "Ready" : displayStatus === "failed" ? "Failed" : "Processing"}</span></div>
      <div className="media-actions"><button className="button ghost" type="button" onClick={inspect}>Preview & status</button><form action={archiveAction}><input name="id" type="hidden" value={asset.id} /><button className="button danger small-button" type="submit">Archive</button></form></div>
    </article>
    {open && <div className="preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="preview-modal" role="dialog" aria-modal="true" aria-label={`Preview ${asset.filename ?? asset.kind}`}><header><div><p className="eyebrow accent">CLOUDFLARE PREVIEW</p><h2>{asset.filename ?? asset.provider_id}</h2></div><button className="modal-close" onClick={() => setOpen(false)} aria-label="Close preview">×</button></header>
      <div className="preview-stage">{asset.kind === "image" ? <Image src={status?.deliveryURL ?? asset.public_url} alt={asset.filename ?? "Image preview"} width={1280} height={720} unoptimized /> : status?.ready && status.embedURL ? <iframe src={status.embedURL} title={asset.filename ?? "Stream preview"} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <div className="processing-state"><span className="spinner" /><strong>{loading ? "Checking Cloudflare…" : "Video is not ready to play"}</strong><small>{status?.progress ? `${status.progress}% processed` : status?.state ?? asset.status}</small></div>}</div>
      {error && <div className="alert error">{error}</div>}
      <div className="status-grid"><div><span>Cloudflare state</span><strong className={status?.ready ? "ok-text" : "wait-text"}>{loading ? "Checking…" : status?.state ?? "—"}</strong></div><div><span>Delivery</span><strong className={status?.ready ? "ok-text" : "wait-text"}>{status?.ready ? "Available" : "Processing"}</strong></div><div><span>Dimensions</span><strong>{status?.width && status?.height ? `${status.width} × ${status.height}` : asset.kind === "image" ? "Original quality" : "—"}</strong></div><div><span>Duration</span><strong>{duration(status?.durationSec)}</strong></div><div><span>File size</span><strong>{bytes(status?.sizeBytes ?? asset.size_bytes)}</strong></div><div><span>Access</span><strong>{status?.signed ? "Signed URL" : "Public URL"}</strong></div></div>
      <div className="assignment-panel"><p className="eyebrow">CONTENT ASSIGNMENT</p>{assignments.length ? <ul>{assignments.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">Not assigned to any staged content yet.</p>}</div>
      {status?.deliveryURL && <div className="delivery-row"><code>{status.deliveryURL}</code><a className="button ghost" href={status.deliveryURL} target="_blank" rel="noreferrer">Open delivery URL</a></div>}
      <footer><button className="button ghost" type="button" onClick={inspect} disabled={loading}>Refresh status</button><button className="button primary" type="button" onClick={() => setOpen(false)}>Done</button></footer>
    </section></div>}
  </>;
}
