// src/services/groqClient.js
// ⚠️ Requires: npm install groq-sdk
// ⚠️ Requires env var: VITE_GROQ_API_KEY

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

// ---------------------------------------------------------------------------
// Schema skeleton injected into system prompt so the model knows every field
// ---------------------------------------------------------------------------
const CONTENT_PLAN_SCHEMA_SKELETON = {
  schema_version: '1.0',
  generated_at: '<ISO timestamp>',
  intent_summary: '<string>',
  content_goal: '<brand_awareness|product_promotion|education|entertainment|lead_generation|community_engagement>',
  platforms: ['<instagram|tiktok|linkedin|x|youtube>'],
  primary_platform: '<string>',
  content_type: '<single|carousel|story|video>',
  carousel: {
    slide_count: '<number 2-10>',
    theme: '<string>',
    slides: [{
      slide_index: '<number>',
      slide_purpose: '<hook|problem|solution|proof|feature|cta|tip|transition>',
      headline: '<string>',
      body_text: '<string optional>',
      image_prompt: '<string, min 40 words>',
    }],
  },
  visual_prompt: {
    global_style: '<string>',
    aspect_ratio: '<1:1|16:9|9:16|4:5>',
    slides: [{
      slide_index: '<number>',
      full_prompt: '<string, min 40 words>',
      negative_prompt: '<string optional>',
    }],
  },
  caption: {
    primary: '<string>',
    hook: '<string>',
    cta: '<string>',
    platform_overrides: { instagram: '<string>', tiktok: '<string>', linkedin: '<string>', x: '<string>' },
  },
  title: {
    generic: '<string>',
    platform_overrides: { youtube: '<string>', linkedin: '<string>' },
  },
  hashtags: {
    primary: ['<string>'],
    niche: ['<string>'],
    trending: ['<string>'],
    brand: ['<string>'],
    platform_sets: { instagram: ['<string>'], tiktok: ['<string>'], linkedin: ['<string>'] },
  },
  seo: {
    optimized_title: '<string>',
    optimized_caption: '<string>',
    optimized_hashtags: ['<string>'],
    score: '<number 0-100>',
    score_category: '<Poor|Ok|Good|Great>',
    score_breakdown: {
      platform_alignment:  { score: '<number>', max: 20, rationale: '<string>' },
      keyword_density:     { score: '<number>', max: 20, rationale: '<string>' },
      caption_structure:   { score: '<number>', max: 20, rationale: '<string>' },
      hashtag_relevance:   { score: '<number>', max: 20, rationale: '<string>' },
      cta_presence:        { score: '<number>', max: 10, rationale: '<string>' },
      brand_consistency:   { score: '<number>', max: 10, rationale: '<string>' },
    },
    improvement_report: [{ type: '<improvement|warning|info>', bullet: '<string>' }],
  },
  guardrails_check: {
    pass: '<boolean>',
    violations: ['<string>'],
    notes: '<string>',
  },
};

const CONTENT_PLAN_SYSTEM_PROMPT = `
You are an expert social media content strategist and creative director.
Your job is to analyze a user's input and produce a comprehensive, brand-consistent ContentPlan JSON object.

RULES:
1. Return ONLY valid JSON. No markdown, no backticks, no preamble.
2. Every required field must be present. Use empty arrays [] or empty strings "" if no content — never null.
3. Your outputs must be internally consistent: caption, hashtags, title, and visual prompts must all reflect the same intent and style.
4. Platform overrides must respect platform constraints:
   - x.com: caption ≤ 280 chars
   - Instagram: ideal caption 125–150 words; up to 30 hashtags
   - LinkedIn: more formal tone; no hashtag spam (max 5–7)
   - TikTok: casual, punchy; 3–5 hashtags; hook in first 3 words
   - YouTube: title max 70 chars; SEO-focused; description-style caption
5. For carousels: slide_count must be 2–10; first slide is always the hook; ContentPlan decides slide count based on prompt complexity.
6. Image prompts must be detailed, vivid, technically specific (lighting, style, composition, mood). Minimum 40 words per prompt.
7. Hashtags: use camelCase (#SustainableSkincare not #sustainableskincare). No generic spam tags.
8. SEO scores must be honest — if outputs are weak, score them low and explain why in improvement_report.
9. Brand consistency: if a brand kit is provided, all outputs must reflect its voice, avoid its forbidden phrases, and respect its visual style.
10. guardrails_check: actively check for content_restrictions violations.

JSON schema you must follow exactly:
${JSON.stringify(CONTENT_PLAN_SCHEMA_SKELETON, null, 2)}
`.trim();

// ---------------------------------------------------------------------------
// Main ContentPlan call
// ---------------------------------------------------------------------------
export async function callGroqContentPlan(brief) {
  const userMessage = buildUserMessage(brief);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CONTENT_PLAN_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

function buildUserMessage(brief) {
  return `
Create a ContentPlan for the following request.

USER INPUT: "${brief.raw_input}"

INTENT HINTS (from user clarification):
${Object.entries(brief.intent_hints ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None provided — infer from input and history.'}

BRAND KIT:
${brief.brand_summary || 'No brand kit configured. Use neutral, professional defaults.'}

BRAND ASSETS:
${brief.asset_context || 'None.'}

RECENT USER HISTORY (for context/consistency):
${brief.history_summary || 'No prior generations.'}

GENERATION SETTINGS:
- Media type: ${brief.media_type}
- Content type: ${brief.content_type}
- Aspect ratio: ${brief.aspect_ratio}
- Target platforms: ${(brief.platform_targets ?? []).join(', ') || 'Not specified — cover all major platforms'}

Produce the ContentPlan JSON now.
`.trim();
}

// ---------------------------------------------------------------------------
// Quality-gate revision call (called by qualityGate.js)
// ---------------------------------------------------------------------------
const REVISION_SYSTEM = `
You are a content compliance editor. You will receive a ContentPlan JSON and a list of guardrail violations.
Fix ONLY the violations. Do not change unrelated fields.
Return the corrected ContentPlan as valid JSON only. No preamble.
`.trim();

export async function callGroqRevision(plan, violations, brandKit) {
  const msg = `
ContentPlan (JSON):
${JSON.stringify(plan)}

Violations to fix:
${violations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Brand kit context:
${brandKit.summary || 'none'}

Return the corrected ContentPlan JSON.
`.trim();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: REVISION_SYSTEM },
      { role: 'user',   content: msg },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

// ---------------------------------------------------------------------------
// Magic enhance (brand-aware prompt enhancement)
// ---------------------------------------------------------------------------
const ENHANCE_SYSTEM = `
You are an expert prompt engineer for AI image generation.
Enhance the user's prompt to produce cinematic, photorealistic, brand-consistent results.
Return ONLY the enhanced prompt string. No explanation. No JSON. No preamble.
`.trim();

export async function enhancePromptWithBrand(rawPrompt, brandKit) {
  const brandContext = brandKit?.configured
    ? [
        brandKit.raw?.visual_style_keywords?.length
          ? `Brand visual style: ${brandKit.raw.visual_style_keywords.join(', ')}.` : '',
        brandKit.raw?.photo_style_notes
          ? `Photo style: ${brandKit.raw.photo_style_notes}.` : '',
        brandKit.raw?.avoid_visual_elements?.length
          ? `Avoid: ${brandKit.raw.avoid_visual_elements.join(', ')}.` : '',
      ].filter(Boolean).join(' ')
    : '';

  const userMsg = `
Enhance this prompt for AI image generation.
Original: "${rawPrompt}"
${brandContext ? `\nBrand context:\n${brandContext}` : ''}

Return only the enhanced prompt.
`.trim();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.8,
    max_tokens: 300,
    messages: [
      { role: 'system', content: ENHANCE_SYSTEM },
      { role: 'user',   content: userMsg },
    ],
  });

  return response.choices[0].message.content.trim();
}
