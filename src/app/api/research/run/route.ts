/**
 * /api/research/run — create a research-agent job.
 *
 * Flow:
 *   1. Admin submits the form (topic + keyword + kind + tags)
 *   2. We INSERT a research_agent_jobs row with status='queued'
 *   3. We return the jobId immediately
 *   4. The VPS worker (scripts/anamata-research-worker.py) polls
 *      Supabase for queued jobs, runs the CLI, and updates status
 *   5. The admin UI polls /api/research/status?jobId=X to render
 *      progress
 *
 * Auth: requires a signed-in user. The job is recorded with the
 * user's id as requested_by. Only the requester + super_admins can
 * read the job (RLS).
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

export interface RunFormState {
  error?: string;
  jobId?: string;
}

const VALID_KINDS = ["note", "research", "data_drop"] as const;
type Kind = (typeof VALID_KINDS)[number];

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { topic?: string; keyword?: string; kind?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = String(body.topic ?? "").trim();
  const keyword = String(body.keyword ?? "").trim() || topic;
  const kind = (VALID_KINDS as readonly string[]).includes(body.kind ?? "")
    ? (body.kind as Kind)
    : "note";
  const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  // Create the job
  const { data, error } = await supabase
    .from("research_agent_jobs")
    .insert({
      topic,
      keyword,
      kind,
      tags,
      requested_by: user.id,
      status: "queued",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: `Could not create job: ${error.message}` }, { status: 500 });
  }

  revalidatePath("/admin/reads");

  return NextResponse.json({
    jobId: data.id,
    status: data.status,
    createdAt: data.created_at,
  });
}