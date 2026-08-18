import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cloudflareServerEnv } from "@/lib/env";

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => ({})) as { filename?: string };
  const env = cloudflareServerEnv();
  const form = new FormData();
  form.set("requireSignedURLs", "false");
  form.set("metadata", JSON.stringify({ source: "b3gtv-admin", filename: body.filename?.slice(0, 240) ?? "upload" }));

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.accountId}/images/v2/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.apiToken}` },
    body: form,
    cache: "no-store",
  });
  const payload = await response.json() as { success: boolean; result?: { id: string; uploadURL: string }; errors?: Array<{ message: string }> };
  if (!response.ok || !payload.success || !payload.result) {
    return NextResponse.json({ error: payload.errors?.[0]?.message ?? "Could not create image upload URL." }, { status: 502 });
  }
  return NextResponse.json({
    id: payload.result.id,
    uploadURL: payload.result.uploadURL,
    publicURL: `https://imagedelivery.net/${env.imagesAccountHash}/${payload.result.id}/${env.imagesVariant}`,
  });
}
