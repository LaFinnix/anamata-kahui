"use client";

import { useActionState, useState } from "react";
import { Upload, Loader2, FileAudio, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  uploadStemAction,
  type StemUploadState,
} from "@/lib/actions/stem-upload";

interface Props {
  releaseId: string;
}

const initialState: StemUploadState = {};

/**
 * <StemUploader/> — file upload form for stems.
 *
 * Drag-and-drop + click-to-select. Audio files only (WAV/FLAC/MP3/AAC/M4A/MP4),
 * 50 MB max. Server action validates + uploads + inserts the stems row.
 */
export function StemUploader({ releaseId }: Props) {
  const [state, formAction, pending] = useActionState(
    uploadStemAction,
    initialState,
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function onPickFile(f: File | undefined) {
    if (f) setFile(f);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4 text-bronze-300" />
          Upload stem
        </CardTitle>
        <CardDescription>
          WAV, FLAC, MP3, AAC, M4A, or MP4. Maximum 50 MB. Files are stored
          in the <code>stems</code> bucket and served from the public URL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={async (formData) => {
            formData.set("release_id", releaseId);
            await formAction(formData);
            setFile(null);
          }}
          className="space-y-3"
        >
          <label
            htmlFor="stem-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onPickFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
              dragOver
                ? "border-bronze-400 bg-bronze-400/10"
                : "border-border bg-muted/30 hover:bg-muted/60"
            }`}
          >
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-foreground">
              {file ? (
                <span className="font-mono">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium">Drop a file here</span>
                  {" or "}
                  <span className="underline">click to choose</span>
                </>
              )}
            </p>
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || "unknown type"}
              </p>
            )}
          </label>
          <input
            id="stem-file"
            name="file"
            type="file"
            accept="audio/wav,audio/flac,audio/mpeg,audio/aac,audio/mp4,video/mp4"
            className="sr-only"
            onChange={(e) => onPickFile(e.target.files?.[0])}
            required
          />

          {file && (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileAudio className="h-3 w-3" />
                Ready to upload
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          )}

          <Button type="submit" size="sm" disabled={!file || pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload stem
          </Button>

          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md border border-pounamu-500/40 bg-pounamu-500/10 px-3 py-2 text-sm text-pounamu-200">
              {state.success}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}