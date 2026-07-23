/**
 * Cron expression parser + next-runs calculator.
 *
 * Supports standard 5-field cron (minute hour dom month dow).
 * Not supported: 6-field (with seconds), quartz-style descriptors
 * like "@daily" or "@hourly", and L/# extensions. Most Vercel Cron
 * configs are standard 5-field, which this covers.
 *
 * Algorithm:
 *   - Parse each field into a set of valid values
 *   - For "next N runs", iterate minute-by-minute from now,
 *     checking if all 5 fields match (bounded to N×366 days)
 */

export interface CronField {
  values: Set<number>;
  raw: string;
}

export type CronFieldName = "minute" | "hour" | "day" | "month" | "dow";

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  day: CronField;
  month: CronField;
  dow: CronField;
  raw: string;
  valid: boolean;
  error?: string;
}

const FIELD_RANGES: Record<CronFieldName, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  day: [1, 31],
  month: [1, 12],
  dow: [0, 6], // 0 = Sunday
};

const FIELD_NAMES: CronFieldName[] = ["minute", "hour", "day", "month", "dow"];

/**
 * Parse a single cron field. Supports:
 *   - "*"            → all values in range
 *   - "A"            → single value A
 *   - "A,B,C"        → set {A,B,C}
 *   - "A-B"          → range A..B
 *   - "star-slash-N"  → every Nth value starting at range min
 *   - "A-B/N"        → every Nth value in range A..B
 */
function parseField(raw: string, name: CronFieldName): CronField {
  const [min, max] = FIELD_RANGES[name];
  const set = new Set<number>();

  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      return { values: new Set(), raw };
    }

    // */N or A-B/N
    if (trimmed.includes("/")) {
      const [rangePart, stepStr] = trimmed.split("/");
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) {
        return { values: new Set(), raw };
      }
      let rangeStart: number, rangeEnd: number;
      if (rangePart === "*") {
        rangeStart = min;
        rangeEnd = max;
      } else if (rangePart.includes("-")) {
        const [a, b] = rangePart.split("-").map((s) => parseInt(s, 10));
        if (isNaN(a) || isNaN(b)) return { values: new Set(), raw };
        rangeStart = a;
        rangeEnd = b;
      } else {
        const single = parseInt(rangePart, 10);
        if (isNaN(single)) return { values: new Set(), raw };
        rangeStart = single;
        rangeEnd = max;
      }
      for (let v = rangeStart; v <= rangeEnd; v += step) set.add(v);
      continue;
    }

    // A-B (range)
    if (trimmed.includes("-")) {
      const [aStr, bStr] = trimmed.split("-");
      const a = parseInt(aStr, 10);
      const b = parseInt(bStr, 10);
      if (isNaN(a) || isNaN(b)) return { values: new Set(), raw };
      for (let v = a; v <= b; v++) set.add(v);
      continue;
    }

    // A (single)
    const single = parseInt(trimmed, 10);
    if (isNaN(single)) return { values: new Set(), raw };
    set.add(single);
  }

  return { values: set, raw };
}

/** Parse a 5-field cron expression. */
export function parseCron(expression: string): ParsedCron {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return {
      minute: { values: new Set(), raw: "" },
      hour: { values: new Set(), raw: "" },
      day: { values: new Set(), raw: "" },
      month: { values: new Set(), raw: "" },
      dow: { values: new Set(), raw: "" },
      raw: trimmed,
      valid: false,
      error: `Expected 5 fields, got ${parts.length}`,
    };
  }

  const [mStr, hStr, dStr, moStr, dowStr] = parts;
  const minute = parseField(mStr, "minute");
  const hour = parseField(hStr, "hour");
  const day = parseField(dStr, "day");
  const month = parseField(moStr, "month");
  const dow = parseField(dowStr, "dow");

  const valid =
    minute.values.size > 0 &&
    hour.values.size > 0 &&
    day.values.size > 0 &&
    month.values.size > 0 &&
    dow.values.size > 0;

  return {
    minute,
    hour,
    day,
    month,
    dow,
    raw: trimmed,
    valid,
  };
}

/** Check if a date matches a parsed cron. */
function matches(date: Date, cron: ParsedCron): boolean {
  return (
    cron.minute.values.has(date.getMinutes()) &&
    cron.hour.values.has(date.getHours()) &&
    cron.day.values.has(date.getDate()) &&
    cron.month.values.has(date.getMonth() + 1) &&
    cron.dow.values.has(date.getDay())
  );
}

/** Compute the next N run dates after a given starting time. */
export function nextRuns(cron: ParsedCron, count: number, from: Date = new Date()): Date[] {
  if (!cron.valid) return [];
  const results: Date[] = [];
  // Start at the next minute boundary
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  // Bounded search: cap at 366 days × 24 hours × 60 minutes to prevent
  // pathological cases (e.g. impossible schedules) from running forever.
  const maxIterations = 366 * 24 * 60;
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    if (matches(cursor, cron)) {
      results.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
    iterations += 1;
  }

  return results;
}

/**
 * Human-readable description of a parsed cron.
 * Approximate — handles the most common patterns. Anything more
 * exotic will fall through to a generic description.
 */
export function describeCron(cron: ParsedCron): string {
  if (!cron.valid) return "Invalid cron expression";

  const m = cron.minute.raw;
  const h = cron.hour.raw;
  const d = cron.day.raw;
  const mo = cron.month.raw;
  const dow = cron.dow.raw;

  // Common: "* * * * *" → "Every minute"
  if (m === "*" && h === "*" && d === "*" && mo === "*" && dow === "*") {
    return "Every minute";
  }

  // Common: "0 * * * *" → "Every hour, on the hour"
  if (m === "0" && h === "*" && d === "*" && mo === "*" && dow === "*") {
    return "Every hour, on the hour";
  }

  // Common: "0 0 * * *" → "Every day at midnight"
  if (m === "0" && h === "0" && d === "*" && mo === "*" && dow === "*") {
    return "Every day at 00:00 (midnight)";
  }

  // Common: "0 9 * * 1-5" → "Weekdays at 9 AM"
  if (m === "0" && h === "9" && d === "*" && mo === "*" && dow === "1-5") {
    return "Weekdays at 09:00";
  }

  // Step: "*/N * * * *" → "Every N minutes"
  const stepMatch = m.match(/^\*\/(\d+)$/);
  if (stepMatch && h === "*" && d === "*" && mo === "*" && dow === "*") {
    return `Every ${stepMatch[1]} minutes`;
  }

  // Step hour: "0 */N * * *" → "Every N hours"
  const hourStepMatch = h.match(/^\*\/(\d+)$/);
  if (m === "0" && hourStepMatch && d === "*" && mo === "*" && dow === "*") {
    return `Every ${hourStepMatch[1]} hours, on the hour`;
  }

  // "0 H * * *" → "Every day at HH:00"
  if (m === "0" && h.match(/^\d+$/) && d === "*" && mo === "*" && dow === "*") {
    return `Every day at ${String(h).padStart(2, "0")}:00`;
  }

  // "M H * * D" → "Every DOW at HH:MM"
  if (m.match(/^\d+$/) && h.match(/^\d+$/) && d === "*" && mo === "*" && dow.match(/^\d+$/)) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `Every ${days[parseInt(dow, 10)]} at ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Fallback: programmatic description
  return `${m} ${h} ${d} ${mo} ${dow} (use Vercel Cron docs to confirm)`;
}
