"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";

export function DashboardFormUX({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const enhance = () => rootRef.current?.querySelectorAll<HTMLFormElement>("form.form-panel, form.inline-form").forEach((form) => {
      if (form.querySelector(".form-reset-button")) return;
      const button = document.createElement("button");
      button.type = "reset"; button.className = "button ghost form-reset-button";
      button.textContent = form.classList.contains("form-panel") ? "Clear form" : "Cancel changes";
      form.append(button);
    });
    enhance();
    const observer = new MutationObserver(enhance);
    if (rootRef.current) observer.observe(rootRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  function showPending(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement;
    if (form.tagName !== "FORM") return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    form.setAttribute("aria-busy", "true"); form.classList.add("form-pending");
    form.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
    if (submitter) submitter.textContent = /publish/i.test(submitter.textContent ?? "") ? "Publishing…" : /archive/i.test(submitter.textContent ?? "") ? "Archiving…" : "Saving…";
  }
  return <div ref={rootRef} onSubmitCapture={showPending}>{children}</div>;
}
