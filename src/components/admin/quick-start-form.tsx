"use client";

import { useState } from "react";
import { Terminal, Clipboard, Check, Sparkles, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PRESET_TOPICS = [
  {
    label: "Iwi consent in music metadata",
    topic: "Iwi consent in music metadata: a field guide for Aotearoa labels",
    keyword: "iwi consent music",
    kind: "note" as const,
    tags: "iwi-consent,music,metadata,governance",
  },
  {
    label: "Local Contexts Hub adoption 2026",
    topic: "Local Contexts Hub adoption in 2026: who is using TK labels and how",
    keyword: "local contexts hub adoption",
    kind: "research" as const,
    tags: "local-contexts,labels,indigenous-data",
  },
  {
    label: "Waiata metadata snapshot",
    topic: "Waiata metadata in Aotearoa labels: a 2026 snapshot",
    keyword: "waiata metadata snapshot",
    kind: "data_drop" as const,
    tags: "waiata,metadata,data",
  },
  {
    label: "Te reo Māori in release titles",
    topic: "Te reo Māori in Aotearoa music release titles: a corpus study",
    keyword: "te reo music releases",
    kind: "research" as const,
    tags: "te-reo,waiata,corpus",
  },
];

/**
 * <QuickStartForm/> — the UI surface for the research-agent pipeline.
 *
 * The operator fills in topic/keyword/kind/tags and we render the exact
 * CLI command they need to run from the VPS shell. We don't try to
 * shell out from Vercel — research-agent lives on the VPS, not in
 * Vercel's serverless runtime (per the harbourline-blog-pipeline
 * reference).
 *
 * After running the CLI, the resulting draft appears in this page's
 * list below (see ReadAdminRow components). The operator then edits
 * it at /admin/reads/[id] before publishing.
 */
export function QuickStartForm() {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<"note" | "research" | "data_drop">("note");
  const [tags, setTags] = useState("");
  const [copied, setCopied] = useState(false);

  function loadPreset(preset: typeof PRESET_TOPICS[number]) {
    setTopic(preset.topic);
    setKeyword(preset.keyword);
    setKind(preset.kind);
    setTags(preset.tags);
  }

  const cmd =
    `cd /opt/data/anamata-kahui && \\\n  python3 scripts/anamata-reads-research.py \\\n    --topic ${JSON.stringify(topic || "TOPIC_HERE")} \\\n    --keyword ${JSON.stringify(keyword || "keyword here")} \\\n    --kind ${kind} \\\n    --tags ${JSON.stringify(tags || "tag1,tag2")}`;

  function copyCommand() {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Topic
          </span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="The article's working title"
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            SEO keyword
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="primary search keyword"
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr,180px]">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags (comma-separated)
          </span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="iwi-consent,music,governance"
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Kind
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="flex h-10 w-full appearance-none rounded-md border border-border bg-input px-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="note">Note (1.5k-3k words)</option>
            <option value="research">Research (3k-8k)</option>
            <option value="data_drop">Data Drop (500-1.5k)</option>
          </select>
        </label>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Or load a preset
        </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {PRESET_TOPICS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => loadPreset(p)}
            >
              <Sparkles className="h-3 w-3" />
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {topic && (
        <Card className="border-bronze-500/30 bg-bronze-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4 text-bronze-300" />
              Run from VPS shell
            </CardTitle>
            <CardDescription>
              research-agent lives on the VPS, not Vercel. Run the
              command below from the host that owns the research-agent
              stack. The draft appears in this admin page when done
              (usually ~90s).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
{cmd}
            </pre>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={copyCommand}
                disabled={!topic}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3 w-3" />
                    Copy command
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Expected runtime: ~90s. ~$0.02 OpenRouter cost.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <FileText className="mr-1 inline h-3 w-3" />
              Draft appears as a row in this page when complete. Edit
              at <code className="font-mono">/admin/reads/&lt;id&gt;</code>{" "}
              before publishing.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}