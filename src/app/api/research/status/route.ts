/**
 * /api/research/status — poll for job status.
 *
 * Returns the current state of a research_agent_jobs row. The admin
 * UI polls this every 3s while a job is running.
 *
 * Auth: requires a signed-in user. RLS ensures only the requester
 * or a super_admin can read the job.
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("research_agent_jobs")
    .select("id, status, started_at, finished_at, result_draft_id, audit_score, word_count, error_message, vps_worker_id, created_at, topic, kind")
    .eq("id", jobId)
    .single();

  if (error) {
    return NextResponse.json({ error: `Job not found: ${error.message}` }, { status: 404 });
  }

  return NextResponse.json({
    jobId: data.id,
    status: data.status,
    topic: data.topic,
    kind: data.kind,
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    resultDraftId: data.result_draft_id,
    auditScore: data.audit_score,
    wordCount: data.word_count,
    errorMessage: data.error_message,
    vpsWorkerId: data.vps_worker_id,
    createdAt: data.created_at,
  });
}