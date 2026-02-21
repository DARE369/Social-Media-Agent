// src/services/historyLoader.js
import { supabase } from '../services/supabaseClient';

export async function loadUserHistory(userId, limit = 10) {
  const { data } = await supabase
    .from('generations')
    .select('prompt, media_type, metadata, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data?.length) return '';

  const items = data
    .map(g => `- ${g.media_type ?? 'image'}: "${(g.prompt ?? '').slice(0, 100)}"`)
    .join('\n');

  return `Recent generations by this user:\n${items}`;
}
