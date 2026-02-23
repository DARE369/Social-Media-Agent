import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  extractFirstGeneratedUrl,
  extractProgress,
  getVideoTaskStatus,
  normalizeTaskStatus,
  type FreepikTaskData,
} from "../_shared/freepik.service.ts";
import { buildGeneratedAssetPath, ensureBucketExists, uploadFromRemoteUrl } from "../_shared/storage.ts";
import { createAdminClient, createAuthClient, requireUser } from "../_shared/supabase.ts";
import { handleCors, jsonResponse, mapErrorToStatusCode, parseJsonBody, toErrorPayload } from "../_shared/http.ts";

const GENERATED_BUCKET = "generated_assets";

type VideoStatusBody = {
  jobId?: string;
  generationId?: string;
};

function metadataWithJob(existing: unknown, task: FreepikTaskData, jobId: string): Record<string, unknown> {
  const base = (typeof existing === "object" && existing !== null)
    ? existing as Record<string, unknown>
    : {};

  return {
    ...base,
    provider: "freepik",
    freepik_job_id: jobId,
    freepik_status: task.status ?? null,
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authClient = createAuthClient(req.headers.get("Authorization"));
    const user = await requireUser(authClient);
    const supabaseAdmin = createAdminClient();

    const body = await parseJsonBody<VideoStatusBody>(req);
    const jobId = (body.jobId || "").trim();
    const generationId = (body.generationId || "").trim();

    if (!jobId) {
      return jsonResponse({ error: "Missing jobId" }, 400);
    }

    let generationRow: {
      id: string;
      user_id: string;
      storage_path: string | null;
      metadata: unknown;
    } | null = null;

    if (generationId) {
      const { data: directRow } = await supabaseAdmin
        .from("generations")
        .select("id, user_id, storage_path, metadata")
        .eq("id", generationId)
        .eq("user_id", user.id)
        .maybeSingle();
      generationRow = directRow as typeof generationRow;
    }

    if (!generationRow) {
      const { data: byJobRows } = await supabaseAdmin
        .from("generations")
        .select("id, user_id, storage_path, metadata")
        .eq("user_id", user.id)
        .contains("metadata", { freepik_job_id: jobId })
        .limit(1);
      generationRow = byJobRows?.[0] ?? null;
    }

    if (generationRow?.storage_path) {
      return jsonResponse({
        status: "completed",
        progress: 100,
        videoUrl: generationRow.storage_path,
        jobId,
      });
    }

    const task = await getVideoTaskStatus(jobId);
    const normalizedStatus = normalizeTaskStatus(task.status);
    const progress = extractProgress(task) ?? 60;

    if (normalizedStatus === "processing") {
      if (generationRow?.id) {
        await supabaseAdmin
          .from("generations")
          .update({
            status: "processing",
            progress,
            metadata: metadataWithJob(generationRow.metadata, task, jobId),
            updated_at: new Date().toISOString(),
          })
          .eq("id", generationRow.id);
      }

      return jsonResponse({
        status: "processing",
        progress,
        jobId,
      });
    }

    if (normalizedStatus === "failed") {
      if (generationRow?.id) {
        await supabaseAdmin
          .from("generations")
          .update({
            status: "failed",
            progress: 100,
            metadata: {
              ...metadataWithJob(generationRow.metadata, task, jobId),
              error_message: task.error || task.message || "Video generation failed",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", generationRow.id);
      }

      return jsonResponse({
        status: "failed",
        progress: 100,
        jobId,
        error: task.error || task.message || "Video generation failed",
      });
    }

    const providerUrl = extractFirstGeneratedUrl(task);
    if (!providerUrl) {
      throw new Error("Video finished but Freepik returned no URL");
    }

    await ensureBucketExists(supabaseAdmin, GENERATED_BUCKET, true);
    const objectPath = buildGeneratedAssetPath(user.id, "videos", providerUrl, "video/mp4");
    const uploaded = await uploadFromRemoteUrl({
      supabaseAdmin,
      bucket: GENERATED_BUCKET,
      objectPath,
      sourceUrl: providerUrl,
      fallbackContentType: "video/mp4",
    });

    if (generationRow?.id) {
      await supabaseAdmin
        .from("generations")
        .update({
          status: "completed",
          progress: 100,
          storage_path: uploaded.publicUrl,
          metadata: {
            ...metadataWithJob(generationRow.metadata, task, jobId),
            source_video_url: providerUrl,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationRow.id);
    }

    return jsonResponse({
      status: "completed",
      progress: 100,
      videoUrl: uploaded.publicUrl,
      jobId,
    });
  } catch (error) {
    console.error("[videoStatus] error", error);
    return jsonResponse(toErrorPayload(error), mapErrorToStatusCode(error));
  }
});
