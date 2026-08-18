"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "preparing" | "uploading" | "saving" | "done" | "error";

export function ImageUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return setMessage("Choose an image first.");
    if (!file.type.startsWith("image/")) return setMessage("Please choose a valid image file.");
    if (file.size > 10 * 1024 * 1024) return setMessage("Image must be 10 MB or smaller.");
    try {
      setMessage(""); setState("preparing"); setProgress(0);
      const prepare = await fetch("/api/cloudflare/images/direct-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name }) });
      const direct = await prepare.json() as { id?: string; uploadURL?: string; publicURL?: string; error?: string };
      if (!prepare.ok || !direct.id || !direct.uploadURL || !direct.publicURL) throw new Error(direct.error ?? "Could not prepare upload.");
      setState("uploading");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", direct.uploadURL!);
        xhr.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.round((event.loaded / event.total) * 100));
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Cloudflare rejected the image upload."));
        xhr.onerror = () => reject(new Error("Network error during image upload."));
        const form = new FormData(); form.append("file", file); xhr.send(form);
      });
      setState("saving");
      const save = await fetch("/api/media/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "image", providerId: direct.id, publicUrl: direct.publicURL, filename: file.name, mimeType: file.type, sizeBytes: file.size, status: "ready" }) });
      const saved = await save.json() as { error?: string };
      if (!save.ok) throw new Error(saved.error ?? "Image uploaded but metadata could not be saved.");
      setState("done"); setProgress(100); setMessage("Image uploaded successfully.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "Image upload failed.");
    }
  }

  return <div className="upload-card"><div><h2>Upload thumbnail</h2><p className="muted">JPG, PNG, WebP or GIF. Maximum 10 MB.</p></div><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={!["idle","done","error"].includes(state)} /><button className="button primary" type="button" onClick={upload} disabled={!["idle","done","error"].includes(state)}>{state === "idle" || state === "done" || state === "error" ? "Upload image" : state === "preparing" ? "Preparing…" : state === "uploading" ? `Uploading ${progress}%` : "Saving…"}</button>{state === "uploading" && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}{message && <div className={`alert ${state === "error" ? "error" : "success"}`}>{message}</div>}</div>;
}
