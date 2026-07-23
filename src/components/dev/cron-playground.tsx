"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calendar, Clock, Sparkles, BookOpen, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseCron, nextRuns, describeCron, type ParsedCron } from "@/lib/dev/cron";

const PRESETS: { label: string; expression: string; description: string }[] = [
  { label: "Every minute", expression: "* * * * *", description: "Runs every 60 seconds. Test only — usually wasteful in production." },
  { label: "Every hour", expression: "0 * * * *", description: "On the hour, every hour." },
  { label: "Every day at midnight", expression: "0 0 * * *", description: "Daily maintenance, billing cycles, daily digests." },
  { label: "Weekdays at 9 AM", expression: "0 9 * * 1-5", description: "Business-hour reports, weekday cron." },
  { label: "Weekly on Sunday", expression: "0 0 * * 0", description: "Weekly cleanup / digest / backup." },
  { label: "Vercel Cron refresh", expression: "0 */6 * * *", description: "Every 6 hours, on the hour. This is what Anamata Kāhui uses for the Local Contexts Hub refresh." },
];

const EXAMPLES: { label: string; expression: string }[] = [
  { label: "Every 15 minutes", expression: "*/15 * * * *" },
  { label: "Every 5 minutes", expression: "*/5 * * * *" },
  { label: "Every 30 minutes", expression: "*/30 * * * *" },
  { label: "Quarter past every hour", expression: "15 * * * *" },
  { label: "Half past every hour", expression: "30 * * * *" },
  { label: "Twice a day (9 AM + 9 PM)", expression: "0 9,21 * * *" },
  { label: "First day of every month", expression: "0 0 1 * *" },
  { label: "Last day of every month", expression: "0 0 L * *" },
  { label: "Weekends only", expression: "0 9 * * 6,0" },
];

const TIMEZONES: { value: string; label: string; offset: string }[] = [
  { value: "Pacific/Auckland", label: "Aotearoa / NZ", offset: "UTC+12/+13" },
  { value: "Australia/Sydney", label: "Australia (Sydney)", offset: "UTC+10/+11" },
  { value: "America/Los_Angeles", label: "US (Pacific)", offset: "UTC-8/-7" },
  { value: "America/New_York", label: "US (Eastern)", offset: "UTC-5/-4" },
  { value: "Europe/London", label: "UK (London)", offset: "UTC+0/+1" },
  { value: "Europe/Berlin", label: "Central Europe (Berlin)", offset: "UTC+1/+2" },
  { value: "Asia/Tokyo", label: "Japan (Tokyo)", offset: "UTC+9" },
  { value: "UTC", label: "UTC", offset: "UTC+0" },
];

/**
 * Cron expression playground — server component renders the page shell,
 * the client component handles all the interactive parsing.
 */
export function CronPlayground() {
  const [expression, setExpression] = useState("0 */6 * * *");
  const [timezone, setTimezone] = useState("Pacific/Auckland");
  const [count, setCount] = useState(5);

  const parsed: ParsedCron = useMemo(() => parseCron(expression), [expression]);

  const runs = useMemo(() => {
    if (!parsed.valid) return [];
    const utcRuns = nextRuns(parsed, count);
    return utcRuns;
  }, [parsed, count]);

  const description = useMemo(() => describeCron(parsed), [parsed]);

  return (
    <div className="space-y-6">
      {/* Input row */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-bronze-300" />
            Cron expression
          </CardTitle>
          <CardDescription>
            5 fields: <code className="font-mono text-xs">minute hour day-of-month month day-of-week</code>. Use
            <code className="font-mono text-xs">*</code>, <code className="font-mono text-xs">*/N</code>,
            <code className="font-mono text-xs">A,B,C</code>, <code className="font-mono text-xs">A-B</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              className="flex h-11 w-full rounded-md border border-border bg-input px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cron expression"
            />
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="h-11 rounded-md border border-border bg-input px-3 text-sm"
              aria-label="How many runs to show"
            >
              <option value="3">3 runs</option>
              <option value="5">5 runs</option>
              <option value="10">10 runs</option>
              <option value="20">20 runs</option>
            </select>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-11 rounded-md border border-border bg-input px-3 text-sm"
              aria-label="Timezone"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
          </div>

          {/* Field-by-field status */}
          {parsed.valid ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <FieldBadge name="min" valid field={parsed.minute} />
              <FieldBadge name="hr" valid field={parsed.hour} />
              <FieldBadge name="day" valid field={parsed.day} />
              <FieldBadge name="mo" valid field={parsed.month} />
              <FieldBadge name="dow" valid field={parsed.dow} />
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {parsed.error ?? "Invalid cron expression"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-bronze-300" />
            Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{description}</p>
        </CardContent>
      </Card>

      {/* Next runs */}
      {parsed.valid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-bronze-300" />
              Next {count} runs
            </CardTitle>
            <CardDescription>
              All times shown in <span className="font-mono">{timezone}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {runs.map((run, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    #{i + 1}
                  </span>
                  <span className="flex-1">
                    {run.toLocaleString("en-NZ", {
                      timeZone: timezone,
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {Math.round(
                      (run.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                    )}
                    d from now
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-bronze-300" />
            Common presets
          </CardTitle>
          <CardDescription>Click any preset to load it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.expression}
                type="button"
                onClick={() => setExpression(p.expression)}
                className="rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-bronze-500/50 hover:bg-bronze-900/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.label}</span>
                  <code className="font-mono text-xs text-muted-foreground">
                    {p.expression}
                  </code>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">More examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.expression}
                type="button"
                onClick={() => setExpression(ex.expression)}
                className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30"
              >
                <span>{ex.label}</span>
                <code className="font-mono text-xs text-muted-foreground">
                  {ex.expression}
                </code>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldBadge({
  name,
  valid,
  field,
}: {
  name: string;
  valid: boolean;
  field: { raw: string; values: Set<number> };
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${
        valid ? "border-pounamu-500/30 bg-pounamu-500/5" : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <span className="text-muted-foreground">{name}=</span>
      <span className="font-medium">{field.raw}</span>
      <span className="text-muted-foreground">({field.values.size})</span>
    </div>
  );
}