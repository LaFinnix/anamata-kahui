#!/usr/bin/env python3
"""
Funding radar refresh — runs weekly, Monday 09:00 NZT.

Reads /opt/data/anamata/funding/TRACKER.md and:
1. Parses the round table (eligible/borderline rounds with deadlines).
2. For each round currently open and within 14 days of closing, escalates
   to Telegram via the system send_message endpoint.
3. When a round closes without submission, flags as missed opportunity.

Designed to be invoked by Hermes cron — see ops/cron/jobs.json for the
registration. Output is structured so the LLM-driven funding agent can
draft applications from it.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

TRACKER = Path("/opt/data/anamata/funding/TRACKER.md")
OUTPUT = Path("/opt/data/anamata-kahui/docs/funding-radar-latest.json")

def parse_iso_date(s: str) -> dt.date | None:
    s = s.strip()
    if not s:
        return None
    # Common formats in TRACKER.md: "Thu 30 Jul 2026", "Mon 27 Jul 2026", ISO.
    for fmt in (
        "%a %d %b %Y",
        "%Y-%m-%d",
        "%d %b %Y",
        "%d/%m/%Y",
    ):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

def parse_tracker() -> list[dict]:
    """Extract round rows from the Tracker table."""
    text = TRACKER.read_text()
    rows = []
    in_table = False
    for line in text.splitlines():
        if line.strip().startswith("| Round | Body |"):
            in_table = True
            continue
        if in_table and line.startswith("|---"):
            continue
        if in_table and line.strip().startswith("|---"):
            continue
        if in_table and line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) >= 7:
                rows.append({
                    "round": cells[0],
                    "body": cells[1],
                    "open": cells[2],
                    "close": cells[3],
                    "ask": cells[4],
                    "status": cells[5],
                    "notes": cells[6],
                })
        elif in_table and not line.startswith("|"):
            in_table = False
    return rows

def evaluate(rows: list[dict], today: dt.date) -> dict:
    open_now: list[dict] = []
    closing_soon: list[dict] = []  # within 14 days
    missed: list[dict] = []  # closed within last 7 days, no submission indicator

    for row in rows:
        # Skip discontinued programmes outright.
        if "DISCONTINUED" in (row.get("status") or "").upper() or "DISCONTINUED" in (row.get("notes") or "").upper():
            continue
        if "discontinued" in (row.get("notes") or "").lower():
            continue

        close_date = parse_iso_date(row["close"])
        open_date = parse_iso_date(row["open"])
        if close_date is None:
            continue

        days_until_close = (close_date - today).days
        days_since_open = (today - open_date).days if open_date else 0

        is_open = open_date <= today <= close_date if open_date else (today <= close_date)
        is_eligible = row["status"] in ("eligible", "eligible?", "borderline")

        if is_open and is_eligible:
            entry = {**row, "days_until_close": days_until_close}
            open_now.append(entry)
            if 0 <= days_until_close <= 14:
                closing_soon.append(entry)
        elif close_date < today and (today - close_date).days <= 7:
            # Recently closed without explicit submission status
            if row["status"] not in ("submitted", "won", "decided", "lost"):
                missed.append({**row, "days_since_close": (today - close_date).days})

    return {
        "generated_at": today.isoformat(),
        "open_now": sorted(open_now, key=lambda r: r["days_until_close"]),
        "closing_soon": sorted(closing_soon, key=lambda r: r["days_until_close"]),
        "missed_recently": missed,
        "summary": {
            "open_count": len(open_now),
            "closing_soon_count": len(closing_soon),
            "missed_count": len(missed),
        },
    }

def main() -> int:
    if not TRACKER.exists():
        print(f"Tracker not found at {TRACKER}", file=sys.stderr)
        return 1

    today = dt.date.today()
    rows = parse_tracker()
    if not rows:
        print(f"No rows parsed from {TRACKER}", file=sys.stderr)

    result = evaluate(rows, today)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False))

    print(f"Funding radar: {result['summary']}")
    if result["closing_soon"]:
        print("\nClosing within 14 days:")
        for r in result["closing_soon"]:
            print(f"  - {r['round']} ({r['body']}): closes {r['close']} ({r['days_until_close']}d)")

    return 0

if __name__ == "__main__":
    sys.exit(main())
