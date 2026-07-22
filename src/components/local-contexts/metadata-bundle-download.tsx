"use client";

import { useActionState, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  generateMetadataBundleAction,
  type MetadataBundleState,
} from "@/lib/actions/metadata-bundle";

interface Props {
  releaseId: string;
}

const initialState: MetadataBundleState = {};

/**
 * <MetadataBundleDownload/> — emits an XMP sidecar + PDF /Info dict +
 * ID3 chunk for the release's Hub project.
 *
 * Workflow:
 *   1. User clicks "Download file metadata"
 *   2. Server composes the bundle (per composeFileMetadataBundle)
 *   3. Browser receives JSON payload
 *   4. Downloads as <slug>.metadata.zip-style bundle (3 files)
 *
 * Client-side mutators can then apply these to the audio/PDF/image
 * binaries using ffmpeg, qpdf, exiftool, etc.
 */
export function MetadataBundleDownload({ releaseId }: Props) {
  const [state, formAction, pending] = useActionState(
    generateMetadataBundleAction,
    initialState,
  );
  const [downloaded, setDownloaded] = useState(false);

  // When the action returns files, trigger download
  if (state?.files && !downloaded) {
    setDownloaded(true);
    const files = state.files;
    const firstName = Object.keys(files)[0];
    if (firstName) {
      // Build a simple HTML wrapper that auto-downloads each file
      // (modern browsers prompt before saving multiple files)
      // For simplicity, we download as a single concatenated text blob
      // with file separators that can be split offline.
      const blob = new Blob(
        [
          `# Local Contexts metadata bundle — generated ${new Date().toISOString()}\n`,
          `# Apply each section to the corresponding file binary.\n\n`,
          ...Object.entries(files).flatMap(([name, content]) => [
            `===== FILE: ${name} =====\n`,
            content,
            `\n===== END: ${name} =====\n\n`,
          ]),
        ],
        { type: "text/plain" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = firstName.replace(/\.[^.]+$/, ".metadata.txt");
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="release_id" value={releaseId} />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download file metadata
        </Button>
      </form>
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      {state?.files && downloaded && (
        <p className="text-xs text-pounamu-300">
          Downloaded {Object.keys(state.files).length} metadata files. Apply them
          to your audio / PDF / image binaries with ffmpeg / qpdf / exiftool.
        </p>
      )}
    </div>
  );
}
