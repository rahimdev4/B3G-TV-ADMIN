import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const allowedKinds = new Set(["image", "video", "trailer"]);

export async function POST(request: Request) {
  const { supabase } = await requireAdmin();
  const body = await request.json().catch(() => null) as null | Record<string, unknown>;
  const kind = String(body?.kind ?? "");
  const providerId = String(body?.providerId ?? "");
  const publicUrl = String(body?.publicUrl ?? "");
  if (!allowedKinds.has(kind) || !providerId || !publicUrl.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid media metadata." }, { status: 400 });
  }
  const { data, error } = await supabase.from("cms_media_assets").insert({
    kind,
    provider_id: providerId,
    public_url: publicUrl,
    thumbnail_url: body?.thumbnailUrl ? String(body.thumbnailUrl) : null,
    filename: body?.filename ? String(body.filename).slice(0, 255) : null,
    mime_type: body?.mimeType ? String(body.mimeType).slice(0, 120) : null,
    size_bytes: typeof body?.sizeBytes === "number" ? body.sizeBytes : null,
    status: body?.status === "processing" ? "processing" : "ready",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
