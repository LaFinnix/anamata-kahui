/**
 * Document loader — finds and parses .md files in the on-disk library.
 *
 * At build time, the loader reads from the filesystem. At request time
 * (route handlers), it reads the same files via `fs.readFile`. This
 * keeps the doc -> file path -> content binding fully observable in
 * git.
 *
 * File naming convention: `<type>.v<semver>.md`
 *   e.g. code_of_conduct.v0.1.0-draft.md
 *        code_of_conduct.v1.0.0.md
 *        label_deal.v2.3.1.md
 *
 * To add a new document version, drop a new file in
 * `src/lib/documents/library/` — the loader picks it up automatically.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseDocument } from "./parser";
import type { Document, DocumentMeta } from "./types";

/** Path to the document library on disk. */
export const DOCUMENT_LIBRARY_PATH = path.join(
  process.cwd(),
  "src/lib/documents/library",
);

/** List all documents in the library, newest first by effective_at. */
export async function listDocuments(): Promise<Document[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(DOCUMENT_LIBRARY_PATH);
  } catch {
    return [];
  }
  const docs: Document[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const content = await fs.readFile(
      path.join(DOCUMENT_LIBRARY_PATH, entry),
      "utf8",
    );
    const doc = parseDocument(content);
    docs.push(doc);
  }
  // Sort newest first
  docs.sort((a, b) => (a.meta.effective_at < b.meta.effective_at ? 1 : -1));
  return docs;
}

/** List all versions of a single document type, newest first. */
export async function listDocumentVersions(
  type: DocumentMeta["type"],
): Promise<Document[]> {
  const all = await listDocuments();
  return all.filter((d) => d.meta.type === type);
}

/** Find the current (highest-version) document of a given type. */
export async function getCurrentDocument(
  type: DocumentMeta["type"],
): Promise<Document | null> {
  const versions = await listDocumentVersions(type);
  if (versions.length === 0) return null;
  // Sort by semver desc — parse X.Y.Z from the version string.
  const cmp = (a: string, b: string) => {
    const [aMaj, aMin, aPat] = a.split(".").map((s) => parseInt(s, 10) || 0);
    const [bMaj, bMin, bPat] = b.split(".").map((s) => parseInt(s, 10) || 0);
    if (aMaj !== bMaj) return aMaj - bMaj;
    if (aMin !== bMin) return aMin - bMin;
    return aPat - bPat;
  };
  versions.sort((a, b) => cmp(b.meta.version, a.meta.version));
  return versions[0];
}

/** Find a specific document by type + version. */
export async function getDocument(
  type: DocumentMeta["type"],
  version: string,
): Promise<Document | null> {
  const all = await listDocuments();
  return all.find((d) => d.meta.type === type && d.meta.version === version) ?? null;
}
