/**
 * JSON utilities — tree building, formatting, recursive diff.
 *
 * Pure functions, no eval, no Function constructor. All client-side.
 */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonNode =
  | { kind: "value"; value: JsonValue; type: string }
  | { kind: "array"; children: JsonNode[] }
  | { kind: "object"; children: Record<string, JsonNode> };

/** Type label for display. */
function typeOf(v: JsonValue): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/** Build a tree representation of a JSON value for the View tab. */
export function jsonTree(v: JsonValue): JsonNode {
  if (v === null || typeof v !== "object") {
    return { kind: "value", value: v, type: typeOf(v) };
  }
  if (Array.isArray(v)) {
    return {
      kind: "array",
      children: v.map((c) => jsonTree(c)),
    };
  }
  const obj: Record<string, JsonNode> = {};
  for (const k of Object.keys(v)) {
    obj[k] = jsonTree((v as Record<string, JsonValue>)[k]);
  }
  return { kind: "object", children: obj };
}

/** Format a JSON value as a string with the given indent. */
export function formatJson(v: JsonValue, indent: number = 2): string {
  return JSON.stringify(v, null, indent);
}

/**
 * Recursive JSON diff — returns a flat list of all differences keyed
 * by their JSONPath (e.g. `$.title`, `$.items[0].name`).
 *
 * This is a path-based diff, not a line-based diff. So reordering
 * keys doesn't trigger "changed" entries (the keys are matched by
 * their position in the parent object).
 */
export type DiffNode =
  | { kind: "added"; path: string; value: JsonValue }
  | { kind: "removed"; path: string; value: JsonValue }
  | { kind: "changed"; path: string; from: JsonValue; to: JsonValue }
  | { kind: "unchanged"; path: string; value: JsonValue };

/** Build a JSONPath for a value. */
function buildPath(parent: string, key: string | number): string {
  if (typeof key === "number") {
    return `${parent}[${key}]`;
  }
  // Use dot notation for keys, bracket notation for keys with special chars
  if (/^[a-zA-Z_$][\w$]*$/.test(key)) {
    return `${parent === "$" ? "" : parent}.${key}`;
  }
  return `${parent}[${JSON.stringify(key)}]`;
}

export function diffJson(a: JsonValue, b: JsonValue): DiffNode[] {
  const result: DiffNode[] = [];
  walk(a, b, "$", result);
  return result;
}

function walk(
  a: JsonValue,
  b: JsonValue,
  path: string,
  result: DiffNode[],
): void {
  // Same primitive or both null
  if (a === b) {
    if (typeof a !== "object" || a === null) {
      result.push({ kind: "unchanged", path, value: a });
    }
    // For objects/arrays that are reference-equal we still recurse to
    // catch nested differences. (If they're truly identical, all
    // children will be unchanged too.)
  }

  // Type changed
  if (typeOf(a) !== typeOf(b)) {
    result.push({ kind: "changed", path, from: a, to: b });
    return;
  }

  // Both null
  if (a === null && b === null) {
    return;
  }

  // Both primitives
  if (typeof a !== "object") {
    if (a !== b) {
      result.push({ kind: "changed", path, from: a, to: b });
    } else {
      result.push({ kind: "unchanged", path, value: a });
    }
    return;
  }

  // Both arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      const subPath = buildPath(path, i);
      if (i >= a.length) {
        result.push({ kind: "added", path: subPath, value: b[i] });
      } else if (i >= b.length) {
        result.push({ kind: "removed", path: subPath, value: a[i] });
      } else {
        walk(a[i], b[i], subPath, result);
      }
    }
    return;
  }

  // Both objects — recurse per key (preserves insertion order in modern JS)
  if (!Array.isArray(a) && !Array.isArray(b) && typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, JsonValue>;
    const bo = b as Record<string, JsonValue>;
    const allKeys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    // Stable order: keys present in A first (in A's order), then keys only in B
    for (const k of Object.keys(ao)) {
      allKeys.delete(k);
      if (!(k in bo)) {
        result.push({ kind: "removed", path: buildPath(path, k), value: ao[k] });
      } else {
        walk(ao[k], bo[k], buildPath(path, k), result);
      }
    }
    for (const k of allKeys) {
      result.push({ kind: "added", path: buildPath(path, k), value: bo[k] });
    }
  }
}