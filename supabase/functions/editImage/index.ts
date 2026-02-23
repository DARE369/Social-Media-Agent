import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createImageEditTask,
  extractFirstGeneratedUrl,
  getImageEditTaskStatus,
  mergeBrandKitIntoPrompt,
  normalizeTaskStatus,
  waitForTaskCompletion,
} from "../_shared/freepik.service.ts";
import { buildGeneratedAssetPath, ensureBucketExists, uploadFromRemoteUrl } from "../_shared/storage.ts";
import { createAdminClient, createAuthClient, requireUser } from "../_shared/supabase.ts";
import { handleCors, jsonResponse, mapErrorToStatusCode, parseJsonBody, toErrorPayload } from "../_shared/http.ts";

const GENERATED_BUCKET = "generated_assets";

type EditImageBody = {
  prompt?: string;
  brandKit?: Record<string, unknown>;
  sourceImageUrl?: string;
  aspectRatio?: string;
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authClient = createAuthClient(req.headers.get("Authorization"));
    const user = await requireUser(authClient);

    const body = await parseJsonBody<EditImageBody>(req);
    const prompt = (body.prompt || "").trim();
    const sourceImageUrl = (body.sourceImageUrl || "").trim();

    if (!prompt) {
      return jsonResponse({ error: "Missing prompt" }, 400);
    }

    if (!sourceImageUrl) {
      return jsonResponse({ error: "Missing sourceImageUrl for edit mode" }, 400);
    }

    const mergedPrompt = mergeBrandKitIntoPrompt(prompt, body.brandKit);
    const createdTask = await createImageEditTask({
      prompt: mergedPrompt,
      sourceImageUrl,
      aspectRatio: body.aspectRatio,
    });

    const taskId = createdTask.task_id;
    if (!taskId) {
      throw new Error("Freepik did not return a task id for image edit");
    }

    const finalTask = await waitForTaskCompletion({
      taskId,
      poll: getImageEditTaskStatus,
      timeoutMs: 300_000,
      intervalMs: 3_000,
    });

    const finalStatus = normalizeTaskStatus(finalTask.status);
    if (finalStatus !== "completed") {
      const reason = finalTask.error || finalTask.message || `Image edit ended with status "${finalTask.status}"`;
      throw new Error(reason);
    }

    const providerUrl = extractFirstGeneratedUrl(finalTask);
    if (!providerUrl) {
      throw new Error("Freepik returned no edited image URL");
    }

    const supabaseAdmin = createAdminClient();
    await ensureBucketExists(supabaseAdmin, GENERATED_BUCKET, true);

    const storagePath = buildGeneratedAssetPath(user.id, "images", providerUrl, "image/jpeg");
    const uploaded = await uploadFromRemoteUrl({
      supabaseAdmin,
      bucket: GENERATED_BUCKET,
      objectPath: storagePath,
      sourceUrl: providerUrl,
      fallbackContentType: "image/jpeg",
    });

    return jsonResponse({
      publicUrl: uploaded.publicUrl,
      storagePath: uploaded.storagePath,
      taskId,
      status: "completed",
      provider: "freepik",
      prompt: mergedPrompt,
    });
  } catch (error) {
    console.error("[editImage] error", error);
    return jsonResponse(toErrorPayload(error), mapErrorToStatusCode(error));
  }
});
