"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";

export function StreamUploader({ defaultKind = "video" }: { defaultKind?: "video" | "trailer" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"video" | "trailer">(defaultKind);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return setMessage("Choose a video first.");
    if (!file.type.startsWith("video/")) return setMessage("Please choose a valid video file.");
    setBusy(true); setFailed(false); setMessage("Preparing secure resumable upload…"); setProgress(0);
    try {
      const preparedResponse = await fetch("/api/cloudflare/stream/tus-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size, maxDurationSeconds: 21600 }) });
      const prepared = await preparedResponse.json() as { uid?: string; uploadURL?: string; hlsURL?: string; thumbnailURL?: string; error?: string };
      if (!preparedResponse.ok || !prepared.uid || !prepared.uploadURL || !prepared.hlsURL) throw new Error(prepared.error ?? "Could not prepare Stream upload.");
      setMessage("Uploading directly to Cloudflare Stream…");
      await new Promise<void>((resolve, reject) => {
        new tus.Upload(file, { uploadUrl: prepared.uploadURL, uploadSize: file.size, retryDelays: [0, 1000, 3000, 5000, 10000], removeFingerprintOnSuccess: true, onError: reject, onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)), onSuccess: () => resolve() }).start();
      });
      setMessage("Saving staged media record…");
      const savedResponse = await fetch("/api/media/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, providerId: prepared.uid, publicUrl: prepared.hlsURL, thumbnailUrl: prepared.thumbnailURL, filename: file.name, mimeType: file.type, sizeBytes: file.size, status: "processing" }) });
      const saved = await savedResponse.json() as { error?: string };
      if (!savedResponse.ok) throw new Error(saved.error ?? "Video uploaded but metadata could not be saved.");
      setProgress(100); setMessage("Video uploaded. Cloudflare is processing it now.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Stream upload failed."); }
    finally { setBusy(false); }
  }

  return <div className="upload-card stream-upload"><div><h2>Upload video</h2><p className="muted">Resumable upload for movies, episodes, and trailers.</p></div><select value={kind} onChange={(event) => setKind(event.target.value as "video" | "trailer")} disabled={busy}><option value="video">Main video</option><option value="trailer">Trailer</option></select><input ref={inputRef} type="file" accept="video/*" disabled={busy} /><button className="button primary" type="button" onClick={upload} disabled={busy}>{busy ? `Uploading ${progress}%` : "Upload video"}</button>{busy && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}{message && <div className={`alert ${failed ? "error" : "success"}`}>{message}</div>}</div>;
}
