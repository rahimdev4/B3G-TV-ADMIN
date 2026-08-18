import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cloudflareServerEnv } from "@/lib/env";

const base64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => null) as null | { filename?: string; size?: number; maxDurationSeconds?: number };
  const size = Number(body?.size);
  const filename = String(body?.filename ?? "video").slice(0, 240);
  const maxDuration = Math.min(Math.max(Number(body?.maxDurationSeconds) || 21600, 60), 86400);
  if (!Number.isSafeInteger(size) || size <= 0) return NextResponse.json({ error: "Invalid video file size." }, { status: 400 });
  const env = cloudflareServerEnv();
  const expiry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const metadata = [`name ${base64(filename)}`, `maxDurationSeconds ${base64(String(maxDuration))}`, `expiry ${base64(expiry)}`].join(",");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.accountId}/stream?direct_user=true`, { method: "POST", headers: { Authorization: `Bearer ${env.apiToken}`, "Tus-Resumable": "1.0.0", "Upload-Length": String(size), "Upload-Metadata": metadata }, cache: "no-store" });
  const uploadURL = response.headers.get("location");
  const uid = response.headers.get("stream-media-id");
  if (!response.ok || !uploadURL || !uid) {
    const payload = await response.json().catch(() => null) as null | { errors?: Array<{ message?: string }> };
    return NextResponse.json({ error: payload?.errors?.[0]?.message ?? "Could not create resumable Stream upload." }, { status: 502 });
  }
  const delivery = `https://customer-${env.streamCustomerCode}.cloudflarestream.com/${uid}`;
  return NextResponse.json({ uid, uploadURL, hlsURL: `${delivery}/manifest/video.m3u8`, thumbnailURL: `${delivery}/thumbnails/thumbnail.jpg` });
}
