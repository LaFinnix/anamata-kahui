#!/usr/bin/env python3
"""
anamata-reads-research — local CLI that runs the research-agent pipeline
(Claude 3.5 Sonnet + 14-pattern humanizer rules + Anamata cultural-fidelity
brand addendum + scrub layer) and writes the resulting draft directly into
Supabase as a status='draft' row in the `reads` table.

This is the local-only counterpart to the Next.js `/admin/reads` page
(which uses human-written content because the research-agent stack is
not available inside Vercel's serverless runtime). Both routes share
the same Supabase schema, so drafts produced by either are reviewed
the same way at `/admin/reads/[id]`.

Usage:
  python3 scripts/anamata-reads-research.py --topic "..." [--keyword "..."]
                                           [--kind note|research|data_drop]
                                           [--tags "tag1,tag2,tag3"]
                                           [--author-profile-id <uuid>]
                                           [--dry-run]

Requires:
  - /opt/data/research-agent/.venv/bin/python  (the research-agent venv)
  - /opt/data/.env with OPENROUTER_API_KEY
  - /opt/data/anamata-kahui/.env.local with SUPABASE_SERVICE_ROLE_KEY +
    NEXT_PUBLIC_SUPABASE_URL
  - research-agent CLI installed at /opt/data/bin/research-agent (it is)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# ── Paths / env ───────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
ANAMATA_ENV = REPO_ROOT / ".env.local"
SUPABASE_ENV = Path("/opt/data/.env")
RESEARCH_AGENT_ROOT = Path("/opt/data/research-agent")
RESEARCH_AGENT_VENV_PY = RESEARCH_AGENT_ROOT / ".venv" / "bin" / "python"
SHIM_PATH = REPO_ROOT / "scripts" / ".research_agent_run.py"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        # Don't clobber shell-set vars
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# Supabase creds come from .env.local (committed values use placeholder
# service-role key for reference; the real one is gitignored).
load_env_file(ANAMATA_ENV)
# OPENROUTER_API_KEY lives at /opt/data/.env
load_env_file(SUPABASE_ENV)


# ── Cultural-fidelity scrub layer (extends Harbourline's brand scrub) ─
#
# These patterns were specifically rejected by the Anamata brand addendum.
# Even with the addendum in the prompt, the model still emits ~1 em-dash
# per 1KB and the odd superlative. The deterministic scrub layer catches
# anything that slips through.
SUPERLATIVES = [
    "groundbreaking", "revolutionary", "cutting-edge", "next-generation",
    "industry-leading", "world-class", "unparalleled", "transformative",
    "innovative solution", "robust solution", "seamless experience",
    "stands as a testament", "pivotal moment", "vital role",
    "marks a shift", "deeply rooted", "enduring legacy", "indelible mark",
    "trusted", "extraordinary", "precision craftsmanship", "uncompromising",
    "premier", "elite",
]

# Cultural tokenisation patterns — must be replaced with neutral language.
# The brand addendum already instructs the model, but the scrub is the
# last line of defence.
TOKENISATION_PATTERNS = [
    (r"\b(the indigenous|indigenous peoples|indigenous communities)\b",
     "Māori, iwi, and hapū (named specifically where known)"),
    (r"\b(indigenous data sovereignty)\b",
     "Māori data sovereignty (kaitiakitanga over data)"),
    (r"\b(exotic|exoticise|exoticised)\b",
     "specific cultural practice (named)"),
]


def scrub_dashes(text: str) -> str:
    text = re.sub(r"[—–]", ", ", text)
    text = re.sub(r",\s*,+", ",", text)
    text = re.sub(r"\s+,", ",", text)
    return text.strip()


def scrub_superlatives(text: str) -> str:
    out = text
    for w in SUPERLATIVES:
        out = re.sub(rf"\b{re.escape(w)}\b", "", out, flags=re.I)
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r" +([,.])", r"\1", out)
    return out.strip()


def scrub_tokenisation(text: str) -> str:
    """Replace any generic 'indigenous' framing with culturally specific
    language. This is a last-line-of-defence scrub."""
    out = text
    for pat, repl in TOKENISATION_PATTERNS:
        out = re.sub(pat, repl, out, flags=re.I)
    return out


def scrub_emoji(text: str) -> str:
    return re.sub(
        r"[\U0001F300-\U0001FAFF\U0001F1E6-\U0001F1FF"
        r"\u2700-\u27BF\U0001F600-\U0001F64F]",
        "",
        text,
    )


def scrub_brand(text: str) -> str:
    return scrub_emoji(scrub_tokenisation(scrub_superlatives(scrub_dashes(text))))


# ── Markdown parser (YAML frontmatter + body + References) ────────────
def parse_research_md(md: str) -> dict[str, Any]:
    fm: dict[str, str] = {}
    body = md
    if md.startswith("---"):
        after = md[3:]
        end = after.find("\n---")
        if end != -1:
            fm_block = after[:end]
            body = after[end + 4 :].strip()
            for line in fm_block.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    fm[k.strip()] = v.strip()

    title_m = re.search(r"^# (.+)$", body, re.M)
    title = (title_m.group(1).strip() if title_m else fm.get("title", ""))

    refs_match = re.search(
        r"^## References\s*\n([\s\S]+?)(?=\n## |\Z)", body, re.M,
    )
    references: list[dict[str, str]] = []
    if refs_match:
        for line in refs_match.group(1).splitlines():
            m = re.match(r"\d+\.\s+\[(.+?)\]\((.+?)\)", line)
            if m:
                references.append({"label": m.group(1), "url": m.group(2)})

    body_main = (
        body.split("## References")[0].strip()
        if "## References" in body
        else body
    )

    # Subtitle = first paragraph after the H1 if no frontmatter description
    subtitle_m = re.search(r"^# .+\n\n(.+?)\n\n", body_main, re.M | re.S)
    subtitle = (
        fm.get("description")
        or (subtitle_m.group(1).strip()[:200] if subtitle_m else "")
    )

    return {
        "title": title,
        "subtitle": subtitle,
        "meta_desc": fm.get("description", ""),
        "body": body_main,
        "references": references,
        "frontmatter": fm,
    }


# ── Slug helper (mirrors src/lib/actions/reads.ts:slugify) ────────────
def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")[:120]


# ── Humanizer audit (14 patterns, same as research-agent/audit.py) ────
PATTERNS = [
    ("Em-dashes",              r"—",                                          2),
    ("AI vocab",               r"\b(delve|delves|delving|robust|seamless|seamlessly|leverage|leveraging|leveraged|streamline|streamlining|cutting-edge|game-changer|revolutionary|revolutionizing|paradigm|paradigm shift|harness|harnessing|empower|empowering|unleash|unleashing|elevate|elevating|unprecedented|holistic|synergy|transformative|innovative|state-of-the-art|next-generation|world-class|tapestry|intricate|nuanced|navigate the complexities|landscape|realm|in the realm of|in the landscape of)\b", 3),
    ("Significance puffery",   r"\b(stands as|serves as|is a testament|is a reminder|vital role|significant role|crucial role|pivotal moment|pivotal role|underscores|highlights its importance|reflects broader|symbolizing|contributing to|setting the stage for|marking a shift|key turning point|evolving landscape|deeply rooted|enduring legacy|indelible mark|focal point)\b", 4),
    ("Promotional language",   r"\b(revolutionary|groundbreaking|cutting-edge|state-of-the-art|next-generation|world-class|industry-leading|game-changing|unparalleled|unprecedented|innovative solution|powerful solution|robust solution|seamless experience|transformative experience)\b", 4),
    ("Vague attributions",     r"\b(experts say|experts believe|industry experts|many experts|some experts|leading experts|thought leaders|studies show|research shows|according to experts|according to sources|many believe|widely regarded|generally considered|widely considered)\b", 3),
    ("Negative parallelisms",  r"\bnot\s+(just|only|merely|simply)\s+\w+[,;]?\s+(but|also)\s+\w+", 3),
    ("Em-dash spacing",        r" — ",                                        1),
    ("Title Case headings",    r"^##\s+([A-Z][a-z]*\s+){2,}[A-Z][a-z]*",        2),
    ("Generic conclusion",     r"\b(in conclusion|to conclude|in summary|to summarize|overall,?\s+(it'?s|this is)|the future looks bright|exciting times ahead)\b", 5),
    ("Filler phrases",         r"\b(it'?s important to note that|it'?s worth noting that|it should be noted|in today'?s (digital|modern|fast-paced)|in the (ever-evolving|rapidly evolving) (landscape|world|environment)|navigate the (complexities|challenges) of)\b", 4),
    ("Excessive hedging",      r"\b(could potentially|might potentially|could possibly|may possibly|might possibly have the potential to|has the potential to)\b", 2),
    ("Inline-header lists",    r"^[\s]*-\s+\*\*[^*]+:\*\*\s",                  2),
    ("Knowledge cutoff",       r"\b(as of (my|the) (knowledge|training) cutoff|as an AI (language model|assistant)|based on (my|the) (training data|knowledge)|I (cannot|don'?t) have access to (real-time|current) data)\b", 10),
]


def audit(text: str) -> dict[str, Any]:
    findings = {}
    total_penalty = 0
    for name, regex, severity in PATTERNS:
        try:
            matches = list(re.finditer(regex, text, re.MULTILINE | re.IGNORECASE))
        except re.error:
            continue
        if matches:
            hits = []
            for m in matches[:3]:
                start = max(0, m.start() - 20)
                end = min(len(text), m.end() + 20)
                ctx = text[start:end].replace("\n", " ")
                hits.append(f"...{ctx}...")
            findings[name] = {
                "count": len(matches),
                "severity": severity,
                "hits": hits,
            }
            total_penalty += len(matches) * severity

    chars = len(text)
    score = 100 if chars == 0 else max(0, 100 - (total_penalty * 1000 // chars))

    return {
        "score": score,
        "findings": findings,
        "chars": chars,
        "total_penalty": total_penalty,
    }


# ── Brand check (extends Harbourline) ────────────────────────────────
def brand_check(text: str) -> list[str]:
    issues: list[str] = []
    if "—" in text or "–" in text:
        issues.append(f"em/en-dash ({text.count('—') + text.count('–')})")
    for w in SUPERLATIVES:
        if re.search(rf"\b{re.escape(w)}\b", text, flags=re.I):
            issues.append(f"banned: '{w}'")
    if re.search(
        r"[\U0001F300-\U0001FAFF\U0001F1E6-\U0001F1FF"
        r"\u2700-\u27BF\U0001F600-\U0001F64F]",
        text,
    ):
        issues.append("emoji")
    # Cultural-fidelity checks — flag tokenisation patterns
    if re.search(r"\bindigenous (data sovereignty|communities|peoples)\b", text, flags=re.I):
        issues.append("tokenisation: 'indigenous X' generic framing")
    return issues


# ── Research-agent invocation ─────────────────────────────────────────
def run_research_agent(topic: str, keyword: str, output_path: Path, timeout_s: int = 240) -> dict[str, Any]:
    if output_path.exists():
        output_path.unlink()
    proc = subprocess.run(
        [str(RESEARCH_AGENT_VENV_PY), str(SHIM_PATH), topic, keyword, str(output_path)],
        capture_output=True,
        text=True,
        timeout=timeout_s,
        env={**os.environ, "HOME": os.environ.get("HOME", "/opt/data/home")},
    )
    return {
        "exit_code": proc.returncode,
        "stdout_tail": proc.stdout[-2000:],
        "stderr_tail": proc.stderr[-2000:],
        "output_path": str(output_path),
        "output_exists": output_path.exists(),
    }


# ── Supabase REST helpers ─────────────────────────────────────────────
def supabase_url() -> str:
    return os.environ["NEXT_PUBLIC_SUPABASE_URL"]


def supabase_key() -> str:
    return os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def supabase_request(method: str, path: str, body: dict | None = None, *, headers: dict | None = None) -> tuple[int, Any]:
    url = f"{supabase_url()}/rest/v1{path}"
    data = json.dumps(body).encode() if body is not None else None
    h = {
        "apikey": supabase_key(),
        "Authorization": f"Bearer {supabase_key()}",
        "Content-Type": "application/json",
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode()
            try:
                return resp.status, json.loads(text) if text else None
            except json.JSONDecodeError:
                return resp.status, text
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body_text)
        except json.JSONDecodeError:
            return e.code, body_text


# ── Main flow ──────────────────────────────────────────────────────────
def main() -> int:
    p = argparse.ArgumentParser(
        description="Run research-agent + write a draft to the reads table"
    )
    p.add_argument("--topic", help="Article topic. Required unless --read-id given.")
    p.add_argument("--keyword", help="Target SEO keyword (defaults to topic)")
    p.add_argument(
        "--kind",
        default="note",
        choices=["note", "research", "data_drop"],
        help="Reads kind. note (1.5k-3k words), research (3k-8k), data_drop (500-1.5k).",
    )
    p.add_argument("--tags", help="Comma-separated tags for the read")
    p.add_argument(
        "--author-profile-id",
        help="Profile UUID to set as author_id. Defaults to the only seeded profile (Anamata Records).",
    )
    p.add_argument(
        "--read-id",
        help="Re-generate an existing draft (preserves id + status + slug).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate + audit + scrub but don't write to Supabase.",
    )
    args = p.parse_args()

    if not args.topic and not args.read_id:
        p.error("--topic is required (unless using --read-id)")

    # ── Pre-flight: check prereqs ──
    if not RESEARCH_AGENT_VENV_PY.exists():
        print(f"ERROR: research-agent venv not found at {RESEARCH_AGENT_VENV_PY}", file=sys.stderr)
        return 2
    if not SHIM_PATH.exists():
        print(f"ERROR: shim not found at {SHIM_PATH}", file=sys.stderr)
        return 2
    if "NEXT_PUBLIC_SUPABASE_URL" not in os.environ or "SUPABASE_SERVICE_ROLE_KEY" not in os.environ:
        print("ERROR: SUPABASE creds missing from .env.local", file=sys.stderr)
        return 2

    # ── If --read-id, fetch the existing row to recover the topic ──
    existing = None
    if args.read_id:
        code, row = supabase_request(
            "GET",
            f"/reads?id=eq.{args.read_id}&select=id,slug,title,body_md,kind,tags,author_id,status",
        )
        if code != 200 or not row:
            print(f"ERROR: read {args.read_id} not found (HTTP {code}): {row}", file=sys.stderr)
            return 1
        existing = row[0]
        if not args.topic:
            args.topic = existing["title"]
        if not args.keyword:
            args.keyword = existing["title"]
        if existing.get("kind"):
            args.kind = existing["kind"]
        if existing.get("tags") and not args.tags:
            args.tags = ", ".join(existing["tags"])
        if existing.get("author_id"):
            args.author_profile_id = existing["author_id"]
        print(f"[re-generate] existing draft: {existing['slug']} (status={existing['status']})")
        print(f"              topic: {args.topic}")
    else:
        existing = None

    keyword = args.keyword or args.topic
    print(f"[generate] topic:   {args.topic}")
    print(f"           keyword: {keyword}")
    print(f"           kind:    {args.kind}")

    # ── Run research-agent ──
    slug_part = slugify(args.topic)[:40] or "untitled"
    output_path = Path(f"/tmp/anamata-reads-{slug_part}.md")
    print(f"\n[1/3] Running research-agent CLI (timeout 240s)...")
    result = run_research_agent(args.topic, keyword, output_path)
    if result["exit_code"] != 0:
        print(f"ERROR: research-agent exited {result['exit_code']}", file=sys.stderr)
        print(f"  stderr: {result['stderr_tail']}", file=sys.stderr)
        return 1
    if not result["output_exists"]:
        print(f"ERROR: research-agent produced no output file", file=sys.stderr)
        print(f"  stdout: {result['stdout_tail']}", file=sys.stderr)
        return 1
    print(f"  ✓ wrote {output_path} ({output_path.stat().st_size} bytes)")

    # ── Parse + scrub ──
    print(f"\n[2/3] Parsing + scrubbing...")
    raw_md = output_path.read_text()
    parsed = parse_research_md(raw_md)

    scrubbed_body = scrub_brand(parsed["body"])
    scrubbed_title = scrub_brand(parsed["title"])
    scrubbed_subtitle = scrub_brand(parsed["subtitle"])
    scrubbed_meta = scrub_brand(parsed["meta_desc"])
    scrub_applied = (
        scrubbed_body != parsed["body"]
        or scrubbed_title != parsed["title"]
        or scrubbed_subtitle != parsed["subtitle"]
        or scrubbed_meta != parsed["meta_desc"]
    )

    word_count = len(scrubbed_body.split())
    reading_min = max(1, round(word_count / 225))  # matches reads pipeline
    tags_list = [t.strip() for t in (args.tags or "").split(",") if t.strip()]

    # ── Author resolution ──
    author_id = args.author_profile_id
    if not author_id:
        # Fall back to the only seeded profile (Anamata Records)
        code, profiles = supabase_request(
            "GET", "/profiles?select=id&limit=1&order=created_at.asc"
        )
        if code != 200 or not profiles:
            print("ERROR: no profiles found and no --author-profile-id supplied", file=sys.stderr)
            return 1
        author_id = profiles[0]["id"]
        print(f"           author:  {author_id} (auto-resolved)")

    # ── Audit + brand check on the SCRUBBED output ──
    aud = audit(scrubbed_body + " " + scrubbed_title)
    brand_issues = brand_check(scrubbed_body + " " + scrubbed_title + " " + scrubbed_subtitle + " " + scrubbed_meta)
    target = 90

    print(f"  title:    {scrubbed_title[:80]}")
    print(f"  subtitle: {scrubbed_subtitle[:100]}")
    print(f"  body:     {word_count} words / {len(scrubbed_body)} chars")
    print(f"  reading:  {reading_min} min")
    print(f"  refs:     {len(parsed['references'])}")
    print(f"  tags:     {tags_list}")
    print(f"  scrub:    {'applied' if scrub_applied else 'not needed'}")
    print(f"  audit:    {aud['score']}/100  ({aud['total_penalty']} penalty pts)")
    print(f"  brand:    {'PASS' if not brand_issues else 'FAIL — ' + ', '.join(brand_issues)}")
    if aud["findings"]:
        for name, f in list(aud["findings"].items())[:3]:
            print(f"    {name}: {f['count']}x severity {f['severity']}")

    # ── Build payload ──
    citations = [
        f"{r['label']} — {r['url']}" for r in parsed["references"]
    ]
    base_slug = slugify(scrubbed_title) or slug_part
    if not existing:
        # Try to avoid slug collisions — append random suffix if taken
        code, collision = supabase_request(
            "GET", f"/reads?slug=eq.{base_slug}&select=id"
        )
        if collision:
            import random
            base_slug = f"{base_slug}-{random.randint(1000, 9999)}"

    # Use the rendered markdown body as both body_md and body_html (server-side
    # render + sanitisation will happen on publish in /admin/reads).
    # The Next.js read render uses body_html when present, falling back to
    # rendering body_md. We set body_html to the body_md source so the page
    # shows up correctly without a re-render.
    payload: dict[str, Any] = {
        "slug": base_slug,
        "kind": args.kind,
        "title": scrubbed_title,
        "subtitle": scrubbed_subtitle or None,
        "body_md": scrubbed_body,
        "body_html": scrubbed_body,  # server will re-render + sanitise on publish
        "reading_time_minutes": reading_min,
        "tags": tags_list,
        "meta_description": scrubbed_meta or None,
        "citations": citations,
        "author_id": author_id,
        "status": "draft",
        "data_attachments": [],
    }

    if args.dry_run:
        print(f"\n[3/3] DRY RUN — skipping Supabase write.")
        print(json.dumps(
            {k: v for k, v in payload.items() if k != "body_md" and k != "body_html"},
            indent=2,
        )[:2000])
        return 0

    # ── Write to Supabase ──
    print(f"\n[3/3] Writing draft to Supabase...")
    if existing:
        # Re-generate: UPDATE existing draft
        code, resp = supabase_request(
            "PATCH",
            f"/reads?id=eq.{args.read_id}",
            body=payload,
        )
        if code not in (200, 204):
            print(f"ERROR: PATCH failed (HTTP {code}): {resp}", file=sys.stderr)
            return 1
        print(f"  ✓ updated read {args.read_id}")
        result_id = existing["id"]
        result_slug = existing["slug"]
    else:
        code, resp = supabase_request(
            "POST",
            "/reads",
            body=payload,
            headers={"Prefer": "return=representation"},
        )
        if code not in (200, 201):
            print(f"ERROR: INSERT failed (HTTP {code}): {resp}", file=sys.stderr)
            return 1
        if not resp:
            print("ERROR: INSERT returned empty body", file=sys.stderr)
            return 1
        result_id = resp[0]["id"]
        result_slug = resp[0]["slug"]

    print(f"\n  ✓ draft ready")
    print(f"    id:     {result_id}")
    print(f"    slug:   {result_slug}")
    print(f"    kind:   {args.kind}")
    print(f"    audit:  {aud['score']}/100 (target {target})")
    if aud["score"] < target:
        print(f"    WARNING: below target ({target}). Review before publishing.", file=sys.stderr)
    if brand_issues:
        print(f"    WARNING: brand check failed: {brand_issues}. Review.", file=sys.stderr)
    print(f"    edit:   https://anamatakahui.co.nz/admin/reads/{result_id}")

    return 0 if aud["score"] >= target and not brand_issues else 1


if __name__ == "__main__":
    sys.exit(main())