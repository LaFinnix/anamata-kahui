"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, FileAudio, Upload, X, FileWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  uploadDemoFileAction,
  type DemoUploadState,
} from "@/lib/demos/upload-action";
import {
  FILE_SIZE_LIMITS as DEMO_FILE_SIZE_LIMITS,
  ALLOWED_MIME as DEMO_ALLOWED_MIME,
  formatBytes as formatBytesForDemo,
  sizeLimitForMime,
} from "@/lib/demos/upload-limits";

/**
 * DemoUploadForm — the artist uploads a demo file.
 *
 * Flow:
 *  1. User picks a file via <input type="file">
 *  2. Client-side validation: mime + size (defends against accidental
 *     over-quota attempts that would just bounce at the server)
 *  3. Submit → server action validates again (defence in depth) and
 *     uploads to Supabase Storage, then inserts the demos row
 *  4. On success, the page revalidates and the new demo shows in the
 *     artist's demos list
 *
 * Limits (enforced server-side, displayed client-side):
 *  - Per-file size by mime category
 *  - Per-artist total demo count
 *  - Per-artist total storage
 *  - Per-artist rate (5 uploads/min)
 */
export function DemoUploadForm({
  rosterId,
}: {
  rosterId: string;
}) {
  const t = useTranslations("kaikorero.demos");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DemoUploadState, FormData>(
    uploadDemoFileAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  // Local state
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // Reset on success
  if (state.ok && open) {
    setTimeout(() => {
      setOpen(false);
      setFile(null);
      setClientError(null);
    }, 0);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("uploadDemo")}
      </Button>
    );
  }

  /** Client-side validation: same rules as the server. */
  function validateClientSide(f: File): string | null {
    if (!DEMO_ALLOWED_MIME.has(f.type)) {
      return t("errorBadMime", { type: f.type || "unknown" });
    }
    const limit =
      f.type.startsWith("audio/")
        ? DEMO_FILE_SIZE_LIMITS.audio
        : f.type.startsWith("video/")
        ? DEMO_FILE_SIZE_LIMITS.video
        : f.type.startsWith("image/")
        ? DEMO_FILE_SIZE_LIMITS.image
        : f.type === "application/pdf"
        ? DEMO_FILE_SIZE_LIMITS.document
        : 0;
    if (limit === 0) return t("errorBadMime", { type: f.type });
    if (f.size > limit) {
      return t("errorTooLarge", {
        size: formatBytesForDemo(f.size),
        limit: formatBytesForDemo(limit),
      });
    }
    return null;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setClientError(f ? validateClientSide(f) : null);
    setFile(f);
  }

  // Use the title from file name (without extension) as a sensible default
  const defaultTitle = file ? file.name.replace(/\.[^.]+$/, "") : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-4 w-4 text-bronze-300" />
              {t("uploadTitle")}
            </CardTitle>
            <CardDescription>{t("uploadLede")}</CardDescription>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setFile(null);
              setClientError(null);
            }}
            disabled={pending}
            type="button"
          >
            <X className="h-4 w-4" />
            {t("cancel")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            // Inject the file into the FormData (since file inputs can
            // be tricky with useActionState's FormData plumbing — we
            // pass the file via local state)
            if (file) {
              fd.set("file", file);
            }
            startTransition(() => {
              formAction(fd);
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="artist_roster_id" value={rosterId} />

          {/* File picker — the primary control. Shows client-side
              validation errors immediately. */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="file">
              {t("fileLabel")}
            </label>
            <Input
              id="file"
              name="file"
              type="file"
              required
              onChange={handleFileChange}
              accept={Array.from(DEMO_ALLOWED_MIME).join(",")}
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                <FileAudio className="mr-1 inline h-3 w-3" />
                {file.name} ({formatBytesForDemo(file.size)}, {file.type})
              </p>
            )}
            {clientError && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <FileWarning className="h-3 w-3" />
                {clientError}
              </p>
            )}
            {/* Server error from the action */}
            {state.error && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <FileWarning className="h-3 w-3" />
                {state.error}
              </p>
            )}
          </div>

          {/* Limits reminder — protects users from accidentally hitting them */}
          <details className="rounded-md border border-border bg-muted p-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {t("limitsToggle")}
            </summary>
            <ul className="mt-2 space-y-0.5 text-muted-foreground">
              <li>· {t("limitAudio", { size: formatBytesForDemo(DEMO_FILE_SIZE_LIMITS.audio) })}</li>
              <li>· {t("limitVideo", { size: formatBytesForDemo(DEMO_FILE_SIZE_LIMITS.video) })}</li>
              <li>· {t("limitImage", { size: formatBytesForDemo(DEMO_FILE_SIZE_LIMITS.image) })}</li>
              <li>· {t("limitDocument", { size: formatBytesForDemo(DEMO_FILE_SIZE_LIMITS.document) })}</li>
            </ul>
          </details>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="title">
              {t("demoTitle")}
            </label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={defaultTitle}
              placeholder={t("titlePlaceholder")}
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.title[0]}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="description">
              {t("descriptionLabel")}
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              maxLength={2000}
              placeholder={t("descriptionPlaceholder")}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="file_duration_seconds">
              {t("fileDurationLabel")}
            </label>
            <Input
              id="file_duration_seconds"
              name="file_duration_seconds"
              type="number"
              min="0"
              placeholder="180 (optional, seconds)"
            />
            {state.fieldErrors?.file_duration_seconds && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.file_duration_seconds[0]}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setClientError(null);
              }}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !file || !!clientError}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("uploading")}
                </>
              ) : (
                <>
                  <FileAudio className="h-4 w-4" />
                  {t("upload")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
