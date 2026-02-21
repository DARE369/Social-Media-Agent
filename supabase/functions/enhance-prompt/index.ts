import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { prompt } = await req.json()
    
    // Check available keys
    const GROK_KEY = Deno.env.get('GROK_API_KEY') || Deno.env.get('XAI_API_KEY');
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
    
    let enhancedText = "";

    // === STRATEGY 1: TRY GROK (xAI) ===
    if (GROK_KEY) {
        try {
            console.log("Attempting Grok enhancement...");
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROK_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'grok-2',
                    messages: [
                        { role: 'system', content: 'You are an expert visual prompt engineer. Rewrite the user prompt to be descriptive, artistic, and detailed. Keep it under 40 words. Return ONLY the enhanced prompt text.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                enhancedText = data.choices[0].message.content.trim();
            } else {
                console.error("Grok failed, trying fallback...");
            }
        } catch (err) {
            console.error("Grok Error:", err);
        }
    }

    // === STRATEGY 2: TRY OPENAI (Fallback) ===
    if (!enhancedText && OPENAI_KEY) {
        try {
            console.log("Attempting OpenAI enhancement...");
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are an expert visual prompt engineer. Rewrite the user prompt to be descriptive, artistic, and detailed. Keep it under 40 words. Return ONLY the enhanced prompt text.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                enhancedText = data.choices[0].message.content.trim();
            }
        } catch (err) {
            console.error("OpenAI Error:", err);
        }
    }

    // === STRATEGY 3: MOCK FALLBACK (Free/Safety) ===
    if (!enhancedText) {
        console.log("No AI keys valid, using simple fallback.");
        // If no API keys work, just append some keywords so the UI doesn't crash
        enhancedText = `${prompt}, high quality, 8k resolution, cinematic lighting, detailed texture`;
    }

    // Return result
    return new Response(JSON.stringify({ enhancedPrompt: enhancedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Enhance Function Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})