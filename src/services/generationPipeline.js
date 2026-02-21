// src/services/generationPipeline.js
//
// ⚠️ DEPENDENCY: This file calls generateImage(prompt, aspectRatio).
//    That function must be imported from wherever your existing image
//    provider call lives. Search for the call that sends to fal.ai / 
//    Replicate / DALL-E / etc. and import it here.
//    EXAMPLE: import { generateImage } from './imageProviders';
//
import { supabase }                from '../services/supabaseClient';
import { GENERATION_STATUS }       from '../constants/statusEnums';
import { buildGenerationBrief }    from './briefBuilder';
import { callGroqContentPlan }     from './groqClient';
import { validateAndRepairPlan }   from './contentPlanValidator';
import { runQualityGate }          from './qualityGate';
import { loadBrandKit }            from './brandKitLoader';
import { loadUserHistory }         from './historyLoader';

// ⚠️ Replace this import with your actual image generation function:
// import { generateImage } from './imageProviders';
// Signature expected: async (prompt: string, aspectRatio: string) => string (URL)
let _generateImage = null;
export function registerImageGenerator(fn) { _generateImage = fn; }
async function generateImage(prompt, aspectRatio) {
  if (!_generateImage) throw new Error('[Pipeline] No image generator registered. Call registerImageGenerator() first.');
  return _generateImage(prompt, aspectRatio);
}

const HISTORY_WINDOW = 10;

// ---------------------------------------------------------------------------
// Public entry point — called by SessionStore.startGeneration()
// ---------------------------------------------------------------------------
export async function runGenerationPipeline({
  userInput,
  clarifications = {},
  sessionId,
  userId,
  settings,
  onProgress = () => {},
}) {
  // 1. Load brand kit
  onProgress('Loading brand kit...');
  const brandKit = await loadBrandKit(userId);

  // 2. Load history
  const history = await loadUserHistory(userId, HISTORY_WINDOW);

  // 3. Build brief
  onProgress('Planning content...');
  const brief = buildGenerationBrief({ userInput, clarifications, brandKit, history, settings });

  // 4. Call Groq for ContentPlan
  onProgress('Generating content plan...');
  const rawGroqResponse = await callGroqContentPlan(brief);

  // 5. Validate + auto-repair
  const { plan, repairLog } = validateAndRepairPlan(rawGroqResponse);
  if (repairLog.length > 0) {
    console.warn('[Pipeline] Auto-repaired plan fields:', repairLog);
  }

  // 6. Quality gate
  onProgress('Quality check...');
  const { passed, revisedPlan, notes } = await runQualityGate(plan, brandKit);
  const finalPlan = revisedPlan ?? plan;

  // 7. Store ContentPlan
  const { data: storedPlan, error: planErr } = await supabase
    .from('content_plans')
    .insert({
      user_id:            userId,
      session_id:         sessionId,
      raw_user_input:     userInput,
      intent_summary:     finalPlan.intent_summary,
      content_plan:       finalPlan,
      groq_model:         'llama-3.3-70b-versatile',
      quality_gate_pass:  passed,
      quality_gate_notes: notes,
    })
    .select()
    .single();

  if (planErr) throw new Error(`[Pipeline] Failed to store content plan: ${planErr.message}`);

  // 8. Dispatch to image orchestrator
  if (settings.contentType === 'carousel') {
    return runCarouselOrchestration(finalPlan, storedPlan.id, sessionId, userId, onProgress);
  } else {
    return runSingleGeneration(finalPlan, storedPlan.id, sessionId, userId, settings, onProgress);
  }
}

// ---------------------------------------------------------------------------
// Single image path
// ---------------------------------------------------------------------------
async function runSingleGeneration(plan, contentPlanId, sessionId, userId, settings, onProgress) {
  const prompt      = plan.visual_prompt?.slides?.[0]?.full_prompt ?? plan.visual_prompt?.global_style ?? '';
  const aspectRatio = plan.visual_prompt?.aspect_ratio ?? '1:1';

  onProgress('Generating image...');

  const { data: generation, error: genErr } = await supabase
    .from('generations')
    .insert({
      user_id:        userId,
      session_id:     sessionId,
      prompt,
      media_type:     settings.mediaType ?? 'image',
      status:         GENERATION_STATUS.PROCESSING,
      content_plan_id: contentPlanId,
      metadata:       { aspect_ratio: aspectRatio },
    })
    .select()
    .single();

  if (genErr) throw new Error(`[Pipeline] Failed to insert generation: ${genErr.message}`);

  try {
    const imageUrl = await generateImage(prompt, aspectRatio);
    await supabase.from('generations').update({
      status:       GENERATION_STATUS.COMPLETED,
      storage_path: imageUrl,
      progress:     100,
    }).eq('id', generation.id);
  } catch (err) {
    await supabase.from('generations').update({ status: GENERATION_STATUS.FAILED }).eq('id', generation.id);
    throw err;
  }

  return { contentPlanId, generationIds: [generation.id] };
}

// ---------------------------------------------------------------------------
// Carousel path — sequential, one slide at a time
// ---------------------------------------------------------------------------
async function runCarouselOrchestration(plan, contentPlanId, sessionId, userId, onProgress) {
  const slides      = plan.carousel?.slides ?? [];
  const aspectRatio = plan.visual_prompt?.aspect_ratio ?? '1:1';
  const batchId     = crypto.randomUUID();
  const generationIds = [];

  if (!slides.length) throw new Error('[Pipeline] Carousel has no slides in plan.');

  // Insert all placeholder rows upfront so UI shows skeleton cards immediately
  const placeholders = slides.map((slide, idx) => ({
    user_id:               userId,
    session_id:            sessionId,
    prompt:                slide.image_prompt,
    media_type:            'image',
    status:                GENERATION_STATUS.PROCESSING,
    batch_id:              batchId,
    batch_index:           idx,
    content_plan_id:       contentPlanId,
    carousel_slide_index:  idx,
    carousel_slide_total:  slides.length,
    slide_prompt:          slide.image_prompt,
    metadata: {
      aspect_ratio:  aspectRatio,
      slide_purpose: slide.slide_purpose,
      headline:      slide.headline,
    },
  }));

  const { data: insertedRows, error: insertErr } = await supabase
    .from('generations')
    .insert(placeholders)
    .select();

  if (insertErr) throw new Error(`[Pipeline] Failed to insert carousel placeholders: ${insertErr.message}`);

  // Sort inserted rows by batch_index to ensure correct order
  const sortedRows = [...insertedRows].sort((a, b) => (a.batch_index ?? 0) - (b.batch_index ?? 0));

  // Generate one at a time — sequential
  for (const row of sortedRows) {
    const idx        = row.batch_index ?? 0;
    const fullPrompt = plan.visual_prompt?.slides?.[idx]?.full_prompt ?? slides[idx]?.image_prompt ?? '';

    onProgress(`Generating slide ${idx + 1} of ${slides.length}...`);

    try {
      const imageUrl = await generateImage(fullPrompt, aspectRatio);
      await supabase.from('generations').update({
        status:       GENERATION_STATUS.COMPLETED,
        storage_path: imageUrl,
        progress:     100,
      }).eq('id', row.id);
    } catch (err) {
      await supabase.from('generations').update({ status: GENERATION_STATUS.FAILED }).eq('id', row.id);
      console.error(`[Pipeline] Slide ${idx + 1} failed:`, err);
      // Continue to next slide — partial carousel is better than none
    }

    generationIds.push(row.id);
  }

  return { contentPlanId, batchId, generationIds };
}
