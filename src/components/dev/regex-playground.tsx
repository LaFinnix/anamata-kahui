"use client";

import { useState, useMemo } from "react";
import { Regex, AlertCircle, Copy, Check, BookOpen, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matchRegex, type RegexMatch } from "@/lib/dev/regex";

const PRESETS: { label: string; pattern: string; flags: string; sample: string; description: string }[] = [
  {
    label: "Email",
    pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+",
    flags: "gi",
    sample: "Reach us at hello@anamatakahui.co.nz or office@anamatakahui.co.nz",
    description: "Matches basic email patterns. Not RFC 5322 compliant but works for 99% of real-world emails.",
  },
  {
    label: "URL",
    pattern: "https?:\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+([\\/\\?#][^\\s]*)?",
    flags: "gi",
    sample: "Visit https://anamatakahui.co.nz/dev or http://github.com/LaFinnix/anamata-kahui",
    description: "Matches HTTP/HTTPS URLs.",
  },
  {
    label: "ISO date",
    pattern: "\\d{4}-\\d{2}-\\d{2}",
    flags: "g",
    sample: "Established 2022-07-15; first release 2024-11-30; current 2026-07-23",
    description: "ISO 8601 date (YYYY-MM-DD).",
  },
  {
    label: "Māori vowel (with macron)",
    pattern: "[āēīōūĀĒĪŌŪ]",
    flags: "g",
    sample: "Whakamana, ngāiwi, kōkōwai, pounamu — these are the names that matter.",
    description: "Māori vowels with macrons. Useful for typography checks.",
  },
  {
    label: "Decimal number",
    pattern: "-?\\d+(\\.\\d+)?",
    flags: "g",
    sample: "We received 24 waiata and paid $1,234.56 for licensing.",
    description: "Matches integers and decimals. Negative numbers supported.",
  },
  {
    label: "Hex color",
    pattern: "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b",
    flags: "g",
    sample: "Primary: #b87333, secondary: #2e8b57, on hover: #4a90e2",
    description: "Matches 3- or 6-digit hex color codes.",
  },
  {
    label: "Slug",
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    flags: "",
    sample: "te-tinihanga\nAnamata-Records\nhello world\nfoo--bar",
    description: "Validates URL slugs (lowercase letters, numbers, single dashes).",
  },
  {
    label: "Capture email parts",
    pattern: "([\\w.+-]+)@([\\w-]+\\.[\\w.-]+)",
    flags: "g",
    sample: "admin@anamatakahui.co.nz, finance@anamatakahui.co.nz",
    description: "Email with username and domain as separate capture groups.",
  },
];

const FLAGS_HELP: { flag: string; description: string }[] = [
  { flag: "g", description: "Global — match all occurrences, not just the first" },
  { flag: "i", description: "Case-insensitive" },
  { flag: "m", description: "Multiline — ^ and $ match line boundaries" },
  { flag: "s", description: "Dotall — . matches newlines too" },
  { flag: "u", description: "Unicode — required for emojis and non-BMP chars" },
  { flag: "y", description: "Sticky — match starting at lastIndex only" },
];

export function RegexPlayground() {
  const [pattern, setPattern] = useState(PRESETS[0].pattern);
  const [flags, setFlags] = useState(PRESETS[0].flags);
  const [input, setInput] = useState(PRESETS[0].sample);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => matchRegex(pattern, flags, input), [pattern, flags, input]);

  function copyPattern() {
    const body = `/${pattern}/${flags}`;
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function loadPreset(preset: typeof PRESETS[number]) {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setInput(preset.sample);
  }

  return (
    <div className="space-y-6">
      {/* Pattern + flags + input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Regex className="h-4 w-4 text-bronze-300" />
            Pattern &amp; test string
          </CardTitle>
          <CardDescription>
            Pattern and test string below. Match highlights appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-11 flex-1 items-center rounded-md border border-border bg-input px-3 font-mono text-sm">
              <span className="text-bronze-300">/</span>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-label="Regex pattern"
                className="flex-1 bg-transparent px-1 outline-none"
              />
              <span className="text-bronze-300">/</span>
              <input
                type="text"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-label="Regex flags"
                placeholder="flags"
                className="w-16 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={copyPattern}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div>
            <label htmlFor="regex-input" className="text-xs uppercase tracking-wider text-muted-foreground">
              Test string
            </label>
            <textarea
              id="regex-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              rows={6}
              className="mt-1 flex w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Status */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {result.ok ? (
              <>
                <Badge variant="secondary" className="gap-1">
                  <Hash className="h-3 w-3" />
                  {result.matches.length} match{result.matches.length === 1 ? "" : "es"}
                </Badge>
                <span className="text-muted-foreground">
                  {result.matches.reduce((s, m) => s + (m.groups?.length ?? 0), 0)} capture group{(result.matches.reduce((s, m) => s + (m.groups?.length ?? 0), 0)) === 1 ? "" : "s"} total
                </span>
              </>
            ) : (
              <p className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-3 w-3" />
                {result.error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Highlighted output */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Highlighted matches</CardTitle>
          <CardDescription>
            Each highlight is one match. Capture groups are numbered below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.ok ? (
            result.matches.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No matches yet — try a different pattern or test string.
              </p>
            ) : (
              <HighlightedMatches input={input} matches={result.matches} />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Fix the pattern to see matches.</p>
          )}
        </CardContent>
      </Card>

      {/* Capture group table */}
      {result.ok && result.matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capture groups</CardTitle>
            <CardDescription>
              For each match, the captured substrings (numbered left to right).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.matches.map((m, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-muted/30 p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      match {i + 1}
                    </Badge>
                    <code className="font-mono text-xs text-muted-foreground">
                      chars {m.index}–{m.index + m.match.length - 1}
                    </code>
                  </div>
                  {m.groups && m.groups.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {m.groups.map((g, gi) => (
                        <li key={gi} className="flex items-start gap-2 font-mono text-xs">
                          <span className="text-bronze-300">{`$${gi + 1}`}=</span>
                          <span className="text-pounamu-200">
                            {g === undefined ? (
                              <em className="text-muted-foreground">(no match)</em>
                            ) : (
                              `"${g}"`
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      No capture groups in this pattern.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flag reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FLAGS_HELP.map((f) => (
              <div key={f.flag} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-2">
                <code className="font-mono text-sm text-bronze-300">{f.flag}</code>
                <span className="text-xs text-muted-foreground">{f.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-bronze-300" />
            Common patterns
          </CardTitle>
          <CardDescription>Click any preset to load it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => loadPreset(p)}
                className="rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-bronze-500/50 hover:bg-bronze-900/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.label}</span>
                  <code className="font-mono text-xs text-muted-foreground">
                    /{p.pattern}/{p.flags}
                  </code>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">About this tool</CardTitle>
          <CardDescription>
            All regex execution happens in your browser using the browser&apos;s native{" "}
            <code className="font-mono text-xs">RegExp</code> engine. No data leaves
            your machine. Replaces regex101.com and regexr.com with a
            dependency-free interface.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function HighlightedMatches({ input, matches }: { input: string; matches: RegexMatch[] }) {
  // Build a list of [start, end, matchIndex] segments
  const segments: Array<{ start: number; end: number; matchIndex: number }> = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    segments.push({ start: m.index, end: m.index + m.match.length, matchIndex: i });
  }
  segments.sort((a, b) => a.start - b.start);

  // Render: walk through input, emitting text segments and highlighted matches
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const seg of segments) {
    if (seg.start > cursor) {
      pieces.push(<span key={`t-${cursor}`}>{input.slice(cursor, seg.start)}</span>);
    }
    pieces.push(
      <mark
        key={`m-${seg.matchIndex}-${seg.start}`}
        className="rounded-sm bg-bronze-500/40 px-0.5 font-mono text-foreground"
        title={`Match ${seg.matchIndex + 1}`}
      >
        {input.slice(seg.start, seg.end)}
      </mark>,
    );
    cursor = seg.end;
  }
  if (cursor < input.length) {
    pieces.push(<span key={`t-${cursor}`}>{input.slice(cursor)}</span>);
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed break-words">
      {pieces}
    </pre>
  );
}