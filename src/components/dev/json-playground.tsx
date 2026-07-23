"use client";

import { useState, useMemo } from "react";
import { Braces, AlertCircle, Copy, Check, FileJson, Code2, GitCompare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { jsonTree, formatJson, diffJson, type JsonNode, type DiffNode } from "@/lib/dev/json";

const SAMPLES: { label: string; json: string }[] = [
  {
    label: "Anamata Records waiata",
    json: JSON.stringify(
      {
        title: "Te Tinihanga",
        slug: "te-tinihanga",
        artist: "Anamata Records",
        release_date: "2026-04-12",
        duration_seconds: 247,
        kinds: ["waiata", "mihi"],
        cultural_flags: ["iwi_consent_required"],
        iwi_consent: {
          iwi_name: "Ngāti Whātua ki Ōrākei",
          scope: "release-wide",
          granted_at: "2026-04-08",
        },
        local_contexts: ["TK Attribution", "BC Provenance", "Caring notice"],
      },
      null,
      2,
    ),
  },
  {
    label: "Funding application",
    json: JSON.stringify(
      {
        funder_name: "Creative New Zealand",
        round: "Creative NZ Quick Response 2026",
        status: "awarded",
        amount_awarded_nzd: 10000,
        branch_slug: "records",
      },
      null,
      2,
    ),
  },
  {
    label: "Tiny example",
    json: '{"hello":"world","n":42,"nested":{"a":[1,2,3]}}',
  },
];

type Mode = "view" | "format" | "diff";

export function JsonPlayground() {
  const [input, setInput] = useState(SAMPLES[0].json);
  const [input2, setInput2] = useState('{"title":"Te Tinihanga","status":"draft"}');
  const [mode, setMode] = useState<Mode>("view");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(input) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [input]);

  const tree: JsonNode | null = useMemo(() => {
    if (!parsed.ok) return null;
    return jsonTree(parsed.value);
  }, [parsed]);

  const formatted = useMemo(() => {
    if (!parsed.ok) return null;
    return formatJson(parsed.value, 2);
  }, [parsed]);

  // Diff
  const diff = useMemo(() => {
    if (mode !== "diff") return null;
    try {
      return diffJson(JSON.parse(input), JSON.parse(input2));
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [input, input2, mode]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
        <TabButton active={mode === "view"} onClick={() => setMode("view")} icon={<Braces className="h-3 w-3" />}>
          View
        </TabButton>
        <TabButton active={mode === "format"} onClick={() => setMode("format")} icon={<Code2 className="h-3 w-3" />}>
          Format
        </TabButton>
        <TabButton active={mode === "diff"} onClick={() => setMode("diff")} icon={<GitCompare className="h-3 w-3" />}>
          Diff
        </TabButton>
      </div>

      {mode === "view" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription>Paste JSON below</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                rows={16}
                className="flex w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {SAMPLES.map((s) => (
                  <Button
                    key={s.label}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setInput(s.json)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tree view</CardTitle>
              <CardDescription>
                {parsed.ok ? `${countNodes(tree!)} node${countNodes(tree!) === 1 ? "" : "s"}` : "Invalid JSON"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsed.ok ? (
                <JsonTreeView node={tree!} />
              ) : (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {parsed.error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "format" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compact</CardTitle>
              <CardDescription>No whitespace, one line</CardDescription>
            </CardHeader>
            <CardContent>
              {parsed.ok ? (
                <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(parsed.value)}
                </pre>
              ) : (
                <p className="text-sm text-destructive">{parsed.error}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Pretty (2-space)</span>
                {parsed.ok && (
                  <Button size="sm" variant="secondary" onClick={() => copy(formatted!)}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Sortable, indented</CardDescription>
            </CardHeader>
            <CardContent>
              {parsed.ok ? (
                <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
                  {formatted}
                </pre>
              ) : (
                <p className="text-sm text-destructive">{parsed.error}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "diff" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Left (A)</CardTitle>
                <CardDescription>Original</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  rows={12}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Right (B)</CardTitle>
                <CardDescription>Modified</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={input2}
                  onChange={(e) => setInput2(e.target.value)}
                  spellCheck={false}
                  rows={12}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diff</CardTitle>
              <CardDescription>Added, removed, and changed values</CardDescription>
            </CardHeader>
            <CardContent>
              {diff && "error" in diff ? (
                <p className="text-sm text-destructive">{diff.error}</p>
              ) : diff ? (
                <DiffView nodes={diff} />
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="h-4 w-4 text-bronze-300" />
            About this tool
          </CardTitle>
          <CardDescription>
            Pure client-side JSON parsing using{" "}
            <code className="font-mono text-xs">JSON.parse</code> — no
            <code className="font-mono text-xs">eval</code>, no
            <code className="font-mono text-xs">Function</code> constructor.
            Diff is recursive path-based, not line-based (works for
            reordered keys). No data leaves your browser.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-bronze-400 text-background shadow"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function countNodes(node: JsonNode): number {
  if (node.kind === "value") return 1;
  if (node.kind === "array") return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
  // object
  return 1 + Object.values(node.children).reduce((s, c) => s + countNodes(c), 0);
}

function JsonTreeView({ node }: { node: JsonNode }) {
  if (node.kind === "value") {
    return (
      <div className="flex items-start gap-2 py-0.5 font-mono text-xs">
        <span className="text-muted-foreground">—</span>
        <span>
          <span className="text-muted-foreground">{node.type}: </span>
          <span className="font-semibold text-pounamu-200">
            {JSON.stringify(node.value)}
          </span>
        </span>
      </div>
    );
  }
  if (node.kind === "array") {
    return (
      <details open className="ml-2">
        <summary className="cursor-pointer font-mono text-xs">
          <span className="text-bronze-300">[</span>
          <span className="ml-1 text-muted-foreground">
            {node.children.length} item{node.children.length === 1 ? "" : "s"}
          </span>
          <span className="text-bronze-300">]</span>
        </summary>
        <div className="ml-4 border-l border-border pl-2">
          {node.children.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-xs text-muted-foreground">{i}:</span>
              <div className="flex-1">
                <JsonTreeView node={c} />
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }
  // object
  const keys = Object.keys(node.children);
  return (
    <details open className="ml-2">
      <summary className="cursor-pointer font-mono text-xs">
        <span className="text-bronze-300">{"{"}</span>
        <span className="ml-1 text-muted-foreground">
          {keys.length} key{keys.length === 1 ? "" : "s"}
        </span>
        <span className="text-bronze-300">{"}"}</span>
      </summary>
      <div className="ml-4 border-l border-border pl-2">
        {keys.map((k) => (
          <div key={k} className="flex items-start gap-2">
            <span className="font-mono text-xs text-bronze-300">"{k}"</span>
            <span className="font-mono text-xs text-muted-foreground">:</span>
            <div className="flex-1">
              <JsonTreeView node={node.children[k]} />
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function DiffView({ nodes }: { nodes: DiffNode[] }) {
  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No differences.</p>
    );
  }
  return (
    <ul className="space-y-1">
      {nodes.map((node, i) => (
        <DiffNodeView key={i} node={node} depth={0} />
      ))}
    </ul>
  );
}

const DiffBadge = ({ kind }: { kind: "added" | "removed" | "changed" | "unchanged" }) => {
  if (kind === "added") return <Badge className="bg-pounamu-500/15 text-pounamu-200 border-pounamu-500/40">+ added</Badge>;
  if (kind === "removed") return <Badge variant="destructive">− removed</Badge>;
  if (kind === "changed") return <Badge className="bg-yellow-500/15 text-yellow-200 border-yellow-500/40">~ changed</Badge>;
  return null;
};

function DiffNodeView({ node, depth }: { node: DiffNode; depth: number }) {
  const indent = { marginLeft: depth * 12 };

  if (node.kind === "added") {
    return (
      <li className="rounded-md border border-pounamu-500/30 bg-pounamu-500/5 p-2 text-sm" style={indent}>
        <div className="flex items-center gap-2">
          <DiffBadge kind="added" />
          <code className="font-mono text-xs">{node.path}</code>
        </div>
        <pre className="mt-1 overflow-x-auto font-mono text-xs text-pounamu-200">
          {JSON.stringify(node.value, null, 2)}
        </pre>
      </li>
    );
  }

  if (node.kind === "removed") {
    return (
      <li className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm" style={indent}>
        <div className="flex items-center gap-2">
          <DiffBadge kind="removed" />
          <code className="font-mono text-xs">{node.path}</code>
        </div>
        <pre className="mt-1 overflow-x-auto font-mono text-xs line-through opacity-70">
          {JSON.stringify(node.value, null, 2)}
        </pre>
      </li>
    );
  }

  if (node.kind === "changed") {
    return (
      <li className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-sm" style={indent}>
        <div className="flex items-center gap-2">
          <DiffBadge kind="changed" />
          <code className="font-mono text-xs">{node.path}</code>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <pre className="overflow-x-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs line-through opacity-70">
            {JSON.stringify(node.from, null, 2)}
          </pre>
          <pre className="overflow-x-auto rounded-md border border-pounamu-500/30 bg-pounamu-500/5 p-2 font-mono text-xs">
            {JSON.stringify(node.to, null, 2)}
          </pre>
        </div>
      </li>
    );
  }

  // unchanged
  return (
    <li className="rounded-md border border-border bg-card/30 p-2 text-sm" style={indent}>
      <div className="flex items-center gap-2">
        <code className="font-mono text-xs text-muted-foreground">{node.path}</code>
      </div>
    </li>
  );
}