import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cloudflareServerEnv } from "@/lib/env";

type StreamResult = {
  readyToStream?: boolean;
  duration?: number;
  size?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  status?: { state?: string; pctComplete?: string; errorReasonText?: string };
  playback?: { hls?: string; dash?: string };
};

type ImageResult = {
  draft?: boolean;
  filename?: string;
  uploaded?: string;
  requireSignedURLs?: boolean;
  variants?: string[];
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: asset, error } = await supabase.from("cms_media_assets").select("id,kind,provider_id,public_url,thumbnail_url").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !asset) return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  const env = cloudflareServerEnv();
  const isImage = asset.kind === "image";
  const endpoint = isImage
    ? `https://api.cloudflare.com/client/v4/accounts/${env.accountId}/images/v1/${asset.provider_id}`
    : `https://api.cloudflare.com/client/v4/accounts/${env.accountId}/stream/${asset.provider_id}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${env.apiToken}` }, cache: "no-store" });
  const payload = await response.json() as { success?: boolean; result?: StreamResult | ImageResult; errors?: Array<{ message?: string }> };
  if (!response.ok || !payload.success || !payload.result) return NextResponse.json({ error: payload.errors?.[0]?.message ?? "Cloudflare status check failed." }, { status: 502 });

  if (isImage) {
    const result = payload.result as ImageResult;
    await supabase.from("cms_media_assets").update({ status: result.draft ? "processing" : "ready" }).eq("id", asset.id);
    return NextResponse.json({ type: "image", state: result.draft ? "uploading" : "ready", ready: !result.draft, deliveryURL: asset.public_url, variants: result.variants ?? [], uploadedAt: result.uploaded ?? null, signed: result.requireSignedURLs ?? false });
  }

  const result = payload.result as StreamResult;
  const failed = result.status?.state === "error";
  const storedStatus = result.readyToStream ? "ready" : failed ? "failed" : "processing";
  await supabase.from("cms_media_assets").update({
    status: storedStatus,
    public_url: result.playback?.hls ?? asset.public_url,
    thumbnail_url: result.thumbnail ?? asset.thumbnail_url,
    duration_sec: result.duration == null ? null : Math.round(result.duration),
    size_bytes: result.size ?? null,
  }).eq("id", asset.id);
  return NextResponse.json({
    type: asset.kind,
    state: result.status?.state ?? (result.readyToStream ? "ready" : "processing"),
    ready: result.readyToStream ?? false,
    progress: result.status?.pctComplete ?? null,
    error: result.status?.errorReasonText ?? null,
    durationSec: result.duration ?? null,
    sizeBytes: result.size ?? null,
    width: result.width ?? null,
    height: result.height ?? null,
    deliveryURL: result.playback?.hls ?? asset.public_url,
    dashURL: result.playback?.dash ?? null,
    thumbnailURL: result.thumbnail ?? asset.thumbnail_url,
    embedURL: `https://customer-${env.streamCustomerCode}.cloudflarestream.com/${asset.provider_id}/iframe`,
  });
}
