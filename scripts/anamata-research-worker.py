#!/usr/bin/env python3
"""
anamata-research-worker — VPS-local background worker for the
research-agent pipeline.

Polls Supabase every 5s for queued research_agent_jobs, runs the
research-agent CLI (via .research_agent_run.py), updates the job
status as it goes.

The worker is started by systemd or supervisord on the VPS. It
expects:
  - /opt/data/research-agent/.venv/bin/python (the venv)
  - /opt/data/anamata-kahui/scripts/.research_agent_run.py (the shim)
  - /opt/data/.env (RESEND + OPENROUTER + Supabase creds)
  - /opt/data/anamata-kahui/.env.local (NEXT_PUBLIC + SUPABASE keys)

Run:
  python3 scripts/anamata-research-worker.py
  # or via systemd
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# =============================================================================
# Paths / env
# =============================================================================
SUPABASE_ENV = Path("/opt/data/.env")
ANAMATA_ENV = Path("/opt/data/anamata-kahui/.env.local")
RESEARCH_AGENT_ROOT = Path("/opt/data/research-agent")
RESEARCH_AGENT_VENV_PY = RESEARCH_AGENT_ROOT / ".venv" / "bin" / "python"
SHIM_PATH = Path("/opt/data/anamata-kahui/scripts/.research_agent_run.py")
RUN_SCRIPT_PATH = Path("/opt/data/anamata-kahui/scripts/anamata-reads-research.py")

WORKER_ID = f"vps-{os.uname().nodename}-{os.getpid()}"
POLL_INTERVAL_S = int(os.environ.get("RESEARCH_WORKER_POLL_INTERVAL", "5"))


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env_file(SUPABASE_ENV)
load_env_file(ANAMATA_ENV)

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set", file=sys.stderr)
    sys.exit(2)

if not RESEARCH_AGENT_VENV_PY.exists():
    print(f"ERROR: research-agent venv not found at {RESEARCH_AGENT_VENV_PY}", file=sys.stderr)
    sys.exit(2)

if not SHIM_PATH.exists():
    print(f"ERROR: shim not found at {SHIM_PATH}", file=sys.stderr)
    sys.exit(2)

if not RUN_SCRIPT_PATH.exists():
    print(f"ERROR: anamata-reads-research.py not found at {RUN_SCRIPT_PATH}", file=sys.stderr)
    sys.exit(2)


# =============================================================================
# Supabase REST helpers
# =============================================================================
def supabase_request(method: str, path: str, body: dict | None = None) -> tuple[int, Any]:
    url = f"{URL}/rest/v1{path}"
    data = json.dumps(body).encode() if body is not None else None
    h = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
    }
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


# =============================================================================
# Worker logic
# =============================================================================
def claim_next_job() -> dict | None:
    """Atomically claim the next queued job by setting status=running."""
    # Note: PostgREST doesn't support SELECT FOR UPDATE directly, so we
    # do a manual optimistic claim. The risk is two workers picking up
    # the same job, but with 1 VPS worker this isn't a problem in
    # practice. If we add more workers, use a Postgres function with
    # SELECT FOR UPDATE SKIP LOCKED.
    code, jobs = supabase_request(
        "GET",
        "/research_agent_jobs?status=eq.queued&order=created_at.asc&limit=1&select=*",
    )
    if code != 200 or not jobs:
        return None
    job = jobs[0]

    # Try to claim
    code, _ = supabase_request(
        "PATCH",
        f"/research_agent_jobs?id=eq.{job['id']}&status=eq.queued",
        body={
            "status": "running",
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "vps_worker_id": WORKER_ID,
        },
    )
    if code not in (200, 204):
        return None  # someone else claimed it

    return {**job, "status": "running"}


def run_research_agent(job: dict) -> dict:
    """Run the research-agent CLI for a job. Returns the parsed result."""
    topic = job["topic"]
    keyword = job.get("keyword") or topic
    kind = job.get("kind") or "note"
    tags = job.get("tags") or []

    slug_part = re.sub(r"[^a-z0-9-]+", "-", topic.lower()).strip("-")[:40] or "untitled"
    output_path = Path(f"/tmp/anamata-research-{slug_part}-{job['id']}.md")

    # Run the existing CLI
    proc = subprocess.run(
        [
            "/usr/bin/env", "python3", str(RUN_SCRIPT_PATH),
            "--topic", topic,
            "--keyword", keyword,
            "--kind", kind,
            "--tags", ",".join(tags),
        ],
        capture_output=True,
        text=True,
        timeout=240,  # 4 min
        env={**os.environ, "HOME": os.environ.get("HOME", "/opt/data/home")},
    )

    if proc.returncode != 0:
        return {
            "ok": False,
            "error": proc.stderr[-2000:] or proc.stdout[-2000:],
        }

    # The CLI prints "id: <uuid> slug: <slug> audit: <N>" on success.
    # Parse that.
    result = {"ok": True, "draft_id": None, "audit_score": None, "word_count": None}
    for line in proc.stdout.splitlines():
        if "id:" in line and "uuid" not in line:
            # crude: "    id:     <uuid>"
            parts = line.split("id:")[-1].strip().split()
            if parts:
                result["draft_id"] = parts[0]
        if "audit:" in line:
            try:
                result["audit_score"] = int(line.split("audit:")[-1].strip().split("/")[0].strip())
            except (ValueError, IndexError):
                pass
        if "words" in line and "/" not in line:
            try:
                # "body:     2381 words / 15944 chars"
                result["word_count"] = int(line.split("words")[0].strip().split()[-1])
            except (ValueError, IndexError):
                pass

    return result


def mark_complete(job_id: str, result: dict) -> None:
    supabase_request(
        "PATCH",
        f"/research_agent_jobs?id=eq.{job_id}",
        body={
            "status": "complete",
            "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "result_draft_id": result.get("draft_id"),
            "audit_score": result.get("audit_score"),
            "word_count": result.get("word_count"),
        },
    )


def mark_failed(job_id: str, error: str) -> None:
    supabase_request(
        "PATCH",
        f"/research_agent_jobs?id=eq.{job_id}",
        body={
            "status": "failed",
            "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "error_message": error[:2000],
            "error_stack": traceback.format_exc()[-2000:] if error.startswith("Traceback") else None,
        },
    )


# =============================================================================
# Main loop
# =============================================================================
def main() -> int:
    print(f"[worker {WORKER_ID}] starting; poll interval {POLL_INTERVAL_S}s")

    while True:
        try:
            job = claim_next_job()
            if job is None:
                time.sleep(POLL_INTERVAL_S)
                continue

            print(f"[worker] picked up job {job['id']}: {job['topic'][:60]}")
            result = run_research_agent(job)
            if result["ok"]:
                mark_complete(job["id"], result)
                print(f"[worker] job {job['id']} complete: draft={result.get('draft_id')} audit={result.get('audit_score')}")
            else:
                mark_failed(job["id"], result.get("error", "unknown error"))
                print(f"[worker] job {job['id']} FAILED: {result.get('error', '')[:200]}")
        except KeyboardInterrupt:
            print("[worker] shutting down")
            return 0
        except Exception as e:
            print(f"[worker] unexpected error: {e}", file=sys.stderr)
            traceback.print_exc()
            time.sleep(POLL_INTERVAL_S)

    return 0


if __name__ == "__main__":
    sys.exit(main())