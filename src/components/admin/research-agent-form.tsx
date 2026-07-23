"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { Terminal, Clipboard, Check, Sparkles, Loader2, ExternalLink } from "lucide-react";

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

type JobStatus = "idle" | "submitting" | "queued" | "running" | "complete" | "failed";

interface JobInfo {
  jobId: string;
  status: JobStatus;
  resultDraftId?: string;
  auditScore?: number;
  wordCount?: number;
  errorMessage?: string;
  vpsWorkerId?: string;
}

/**
 * <ResearchAgentForm/> — admin UI for triggering the research-agent.
 *
 * Posts to /api/research/run (Vercel), which creates a job in
 * Supabase. The VPS worker polls Supabase and runs the CLI. The
 * form polls /api/research/status every 3s and renders progress.
 */
export function ResearchAgentForm() {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<"note" | "research" | "data_drop">("note");
  const [tags, setTags] = useState("");
  const [job, setJob] = useState<JobInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, startTransition] = useTransition();

  // Poll /api/research/status while job is queued or running
  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running" && job.status !== "submitting")) {
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/research/status?jobId=${job.jobId}`);
        if (!resp.ok) return;
        const data = await resp.json();
        startTransition(() => {
          setJob({
            jobId: data.jobId,
            status: data.status,
            resultDraftId: data.resultDraftId,
            auditScore: data.auditScore,
            wordCount: data.wordCount,
            errorMessage: data.errorMessage,
            vpsWorkerId: data.vpsWorkerId,
          });
        });
      } catch {
        // ignore — next poll will retry
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job?.jobId, job?.status]);

  function loadPreset(preset: typeof PRESET_TOPICS[number]) {
    setTopic(preset.topic);
    setKeyword(preset.keyword);
    setKind(preset.kind);
    setTags(preset.tags);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic) return;
    setError(null);
    setJob({ jobId: "", status: "submitting" });

    try {
      const resp = await fetch("/api/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          keyword: keyword || topic,
          kind,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error ?? "Could not start job");
        setJob(null);
        return;
      }
      const data = await resp.json();
      setJob({
        jobId: data.jobId,
        status: "queued",
        vpsWorkerId: undefined,
      });
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`);
      setJob(null);
    }
  }

  function reset() {
    setJob(null);
    setError(null);
    setTopic("");
    setKeyword("");
    setTags("");
    setKind("note");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr,180px]">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Topic
            </span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="The article's working title"
              required
              disabled={job?.status === "submitting" || job?.status === "queued" || job?.status === "running"}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Kind
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              disabled={job?.status === "submitting" || job?.status === "queued" || job?.status === "running"}
              className="flex h-10 w-full appearance-none rounded-md border border-border bg-input px-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="note">Note (1.5k-3k words)</option>
              <option value="research">Research (3k-8k)</option>
              <option value="data_drop">Data Drop (500-1.5k)</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            SEO keyword
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="primary search keyword"
            disabled={job?.status === "submitting" || job?.status === "queued" || job?.status === "running"}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags (comma-separated)
          </span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="iwi-consent,music,governance"
            disabled={job?.status === "submitting" || job?.status === "queued" || job?.status === "running"}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
        </label>

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
                disabled={job?.status === "submitting" || job?.status === "queued" || job?.status === "running"}
              >
                <Sparkles className="h-3 w-3" />
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!topic || (job?.status === "submitting" || job?.status === "queued" || job?.status === "running")}>
            {job?.status === "submitting" || job?.status === "queued" || job?.status === "running" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working...
              </>
            ) : (
              <>
                <Terminal className="h-4 w-4" />
                Start research-agent
              </>
            )}
          </Button>
          {(job || error) && (
            <Button type="button" variant="ghost" onClick={reset}>
              Reset
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </form>

      {/* Job status panel */}
      {job && job.jobId && (
        <Card className="border-bronze-500/30 bg-bronze-900/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Job status</span>
              <Badge variant={job.status === "complete" ? "default" : job.status === "failed" ? "destructive" : "secondary"}>
                {job.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Job ID: <code className="font-mono text-xs">{job.jobId}</code>
              {job.vpsWorkerId && <> · Worker: <code className="font-mono text-xs">{job.vpsWorkerId}</code></>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {job.status === "queued" && (
              <p className="text-muted-foreground">
                Waiting for VPS worker to pick this up. The worker polls
                every 5 seconds. You don't need to refresh this page —
                it'll update automatically.
              </p>
            )}
            {job.status === "running" && (
              <p className="text-muted-foreground">
                Worker is running the research-agent CLI now. Typical
                runtime: ~90 seconds. Generating 1,500-3,000 words
                with cultural-fidelity rules.
              </p>
            )}
            {job.status === "complete" && (
              <div className="space-y-2">
                <p className="text-pounamu-300">
                  ✓ Draft ready.
                  {job.auditScore && (
                    <> Humanizer audit: <strong>{job.auditScore}/100</strong>.</>
                  )}
                  {job.wordCount && (
                    <> {job.wordCount.toLocaleString()} words.</>
                  )}
                </p>
                <Button asChild>
                  <Link href={`/admin/reads/${job.resultDraftId}`}>
                    <ExternalLink className="h-3 w-3" />
                    Open draft in admin
                  </Link>
                </Button>
              </div>
            )}
            {job.status === "failed" && (
              <div className="space-y-2">
                <p className="text-destructive">
                  ✗ Job failed. The error has been logged.
                </p>
                {job.errorMessage && (
                  <pre className="overflow-x-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs">
                    {job.errorMessage.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help text — show only when no job is active */}
      {!job && !error && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4 text-bronze-300" />
              How it works
            </CardTitle>
            <CardDescription>
              When you click "Start", we create a job in Supabase. The
              VPS worker (running on anamatakahui.co.nz's host) polls
              every 5 seconds, runs the research-agent CLI, and updates
              the job status as it goes. You see progress in real time.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}