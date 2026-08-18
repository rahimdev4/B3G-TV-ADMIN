"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

export function ArchiveConfirmationGuard({ children }: { children: ReactNode }) {
  const [pendingButton, setPendingButton] = useState<HTMLButtonElement | null>(null);

  function interceptArchive(event: MouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!button || !button.textContent?.trim().toLowerCase().startsWith("archive") || !button.form) return;
    event.preventDefault();
    event.stopPropagation();
    setPendingButton(button);
  }

  function confirmArchive() {
    const button = pendingButton;
    setPendingButton(null);
    button?.form?.requestSubmit(button);
  }

  return <div onClickCapture={interceptArchive}>
    {children}
    {pendingButton && <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingButton(null)}>
      <section className="confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="archive-confirmation-title" aria-describedby="archive-confirmation-description">
        <div className="confirmation-icon" aria-hidden="true">!</div>
        <div><p className="eyebrow">CONFIRM ARCHIVE</p><h2 id="archive-confirmation-title">Archive this content?</h2><p id="archive-confirmation-description" className="muted">This is a soft archive. It will disappear from active CMS lists, but Cloudflare files and legacy live-app content will not be deleted. Published catalog content is managed separately.</p></div>
        <div className="confirmation-actions"><button className="button ghost" type="button" onClick={() => setPendingButton(null)} autoFocus>Cancel</button><button className="button danger" type="button" onClick={confirmArchive}>Yes, archive</button></div>
      </section>
    </div>}
  </div>;
}
