"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "@/store/useUiStore";

export function UploadDialog() {
  const isOpen = useUiStore((s) => s.isUploadOpen);
  const setOpen = useUiStore((s) => s.setUploadOpen);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/pnl/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStatus("done");
      setMessage(`Processed ${data.rows_processed} rows across ${data.divisions.join(", ")}.`);
      qc.invalidateQueries({ queryKey: ["pnl"] });
      qc.invalidateQueries({ queryKey: ["pnl-summary"] });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6">
          <Dialog.Title className="mb-1 text-sm font-bold text-text">Upload Procurement Database</Dialog.Title>
          <Dialog.Description className="mb-4 text-xs text-muted">
            Sheet must be named &quot;Database&quot; with columns: Business Unit, Budget/Actual, Period, Year, plus value creation and the 15 cost components. Combine rows are auto-computed — do not include them.
          </Dialog.Description>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-4 w-full text-xs text-light file:mr-3 file:rounded file:border-0 file:bg-bg3 file:px-3 file:py-1.5 file:text-xs file:text-text"
          />

          {message && (
            <p className={`mb-3 text-xs ${status === "error" ? "text-red" : "text-green"}`}>{message}</p>
          )}

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted">Close</button>
            </Dialog.Close>
            <button
              onClick={handleUpload}
              disabled={!file || status === "uploading"}
              className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-bg disabled:opacity-50"
            >
              {status === "uploading" ? "Uploading..." : "Upload"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
