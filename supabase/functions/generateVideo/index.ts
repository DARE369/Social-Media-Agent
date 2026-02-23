import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createVideoTask, mergeBrandKitIntoPrompt, normalizeTaskStatus } from "../_shared/freepik.service.ts";
import { createAuthClient, requireUser } from "../_shared/supabase.ts";
import { handleCors, jsonResponse, mapErrorToStatusCode, parseJsonBody, toErrorPayload } from "../_shared/http.ts";

type GenerateVideoBody = {
  prompt?: string;
  brandKit?: Record<string, unknown>;
  aspectRatio?: string;
  duration?: number;
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authClient = createAuthClient(req.headers.get("Authorization"));
    await requireUser(authClient);

    const body = await parseJsonBody<GenerateVideoBody>(req);
    const prompt = (body.prompt || "").trim();
    if (!prompt) {
      return jsonResponse({ error: "Missing prompt" }, 400);
    }

    const mergedPrompt = mergeBrandKitIntoPrompt(prompt, body.brandKit);
    const createdTask = await createVideoTask({
      prompt: mergedPrompt,
      ratio: body.aspectRatio,
      duration: body.duration,
    });

    const jobId = createdTask.task_id;
    if (!jobId) {
      throw new Error("Freepik did not return a video job id");
    }

    return jsonResponse({
      jobId,
      status: normalizeTaskStatus(createdTask.status),
      provider: "freepik",
      prompt: mergedPrompt,
    });
  } catch (error) {
    console.error("[generateVideo] error", error);
    return jsonResponse(toErrorPayload(error), mapErrorToStatusCode(error));
  }
});
