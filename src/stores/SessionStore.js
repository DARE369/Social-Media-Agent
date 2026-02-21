// ============================================================================
// ZUSTAND SESSION STORE - SocialAI
// Fixed: status mismatch, success message, hashtag prefix, panel reset
// ============================================================================

import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { POST_STATUS, GENERATION_STATUS } from '../constants/statusEnums';
import {
  generateImages,
  generateVideo,
  enhancePrompt as apiEnhancePrompt,
  generateCaption as apiGenerateCaption,
  optimizeForSEO as apiOptimizeSEO,
} from '../services/ApiService';

export { GENERATION_STATUS, POST_STATUS } from '../constants/statusEnums';

// -- Default post-production state (extracted for easy reset) -----------------
const DEFAULT_POST_PRODUCTION = {
  caption:           '',
  hashtags:          [],
  seoScore:          0,
  selectedPlatforms: [],
  scheduleDate:      null,
};

// -- Helpers ------------------------------------------------------------------
/** Ensure every hashtag starts with # */
const normalizeHashtags = (tags = []) =>
  tags.map(t => (t.startsWith('#') ? t : `#${t}`));

// ============================================================================
const useSessionStore = create((set, get) => ({

  // -- STATE ------------------------------------------------------------------
  sessions:          [],
  activeSession:     null,
  activeGenerations: [],
  selectedGeneration: null,

  isGenerating:      false,
  generationProgress: 0,
  generationStage:   null,
  pendingClarifications: {},
  error:             null,

  settings: {
    mediaType:   'image',
    aspectRatio: '1:1',
    batchSize:   1,
    contentType: 'single',
  },

  postProduction: { ...DEFAULT_POST_PRODUCTION },


  // -- SESSION MANAGEMENT ----------------------------------------------------

  fetchSessions: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      set({ sessions: data || [] });
    } catch (err) {
      console.error('fetchSessions:', err);
      set({ error: err.message });
    }
  },

  createSession: async (title = 'New Session') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .insert([{ user_id: user.id, title, metadata: {} }])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        sessions:          [data, ...state.sessions],
        activeSession:     data,
        activeGenerations: [],
        selectedGeneration: null,
      }));

      return data;
    } catch (err) {
      console.error('createSession:', err);
      set({ error: err.message });
      throw err;
    }
  },

  switchSession: async (sessionId) => {
    try {
      const session = get().sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({
        activeSession:     session,
        activeGenerations: data || [],
        selectedGeneration: null,
        error:             null,
      });
    } catch (err) {
      console.error('switchSession:', err);
      set({ error: err.message });
    }
  },

  deleteSession: async (sessionId) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;

      set(state => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        ...(state.activeSession?.id === sessionId
          ? { activeSession: null, activeGenerations: [], selectedGeneration: null }
          : {}),
      }));
    } catch (err) {
      console.error('deleteSession:', err);
      set({ error: err.message });
      throw err;
    }
  },

  updateSessionTitle: async (sessionId, title) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;

      set(state => ({
        sessions: state.sessions.map(s => s.id === sessionId ? { ...s, title } : s),
        activeSession:
          state.activeSession?.id === sessionId
            ? { ...state.activeSession, title }
            : state.activeSession,
      }));
    } catch (err) {
      console.error('updateSessionTitle:', err);
    }
  },


  // -- GENERATION ACTIONS ----------------------------------------------------

  startGeneration: async (userInput) => {
    const { settings, activeSession, createSession, pendingClarifications } = get();
    set({ isGenerating: true, error: null, generationProgress: 0, generationStage: null });

    try {
      // Ensure session exists.
      let session = activeSession;
      if (!session) {
        const autoTitle = userInput.slice(0, 50) + (userInput.length > 50 ? '...' : '');
        session = await createSession(autoTitle);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Video generation keeps the existing direct flow.
      if (settings.mediaType === 'video') {
        set({ generationStage: 'Generating video...', generationProgress: 20 });

        const { data: created, error: insertError } = await supabase
          .from('generations')
          .insert({
            user_id: user.id,
            session_id: session.id,
            prompt: userInput,
            media_type: 'video',
            status: GENERATION_STATUS.PROCESSING,
            progress: 0,
            metadata: {
              aspect_ratio: settings.aspectRatio,
            },
          })
          .select()
          .single();
        if (insertError) throw insertError;

        set(state => ({
          activeGenerations: [...state.activeGenerations, created],
        }));

        const video = await generateVideo({
          prompt: userInput,
          aspectRatio: settings.aspectRatio,
          duration: 4,
        });

        await supabase
          .from('generations')
          .update({
            status: GENERATION_STATUS.COMPLETED,
            progress: 100,
            storage_path: video.url,
            metadata: {
              aspect_ratio: settings.aspectRatio,
              width: video.width,
              height: video.height,
              duration: video.duration,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', created.id);
      } else {
        const { registerImageGenerator, runGenerationPipeline } =
          await import('../services/generationPipeline');

        registerImageGenerator(async (prompt, aspectRatio) => {
          const images = await generateImages({
            prompt,
            aspectRatio,
            numImages: 1,
          });
          const first = images?.[0];
          if (!first?.url) {
            throw new Error('Image provider returned no URL');
          }
          return first.url;
        });

        const progressMap = {
          'Loading brand kit...': 5,
          'Planning content...': 15,
          'Generating content plan...': 30,
          'Quality check...': 40,
          'Generating image...': 60,
        };

        await runGenerationPipeline({
          userInput,
          clarifications: pendingClarifications ?? {},
          sessionId: session.id,
          userId: user.id,
          settings: {
            ...settings,
            contentType: settings.contentType ?? 'single',
          },
          onProgress: (stage) => {
            const pct = progressMap[stage]
              ?? (stage.startsWith('Generating slide') ? 60 : 50);
            set({ generationProgress: pct, generationStage: stage });
          },
        });
      }

      await supabase
        .from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id);

      const { data: refreshed } = await supabase
        .from('generations')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      set({
        activeGenerations: refreshed || get().activeGenerations,
        error: null,
      });
    } catch (err) {
      console.error('startGeneration error:', err);
      set({ error: err.message });
      throw err;
    } finally {
      set({
        isGenerating: false,
        generationProgress: 0,
        generationStage: null,
      });
    }
  },

  enhancePrompt: async (prompt) => {
    try {
      const enhanced = await apiEnhancePrompt(prompt);
      return enhanced;
    } catch (err) {
      console.error('enhancePrompt:', err);
      return prompt; // Return original on failure
    }
  },


  // -- POST-PRODUCTION -------------------------------------------------------

  selectGeneration: (generation) => {
    set({ selectedGeneration: generation });
  },

  /**
   * Reset post-production state (called when panel opens with a new selection)
   */
  resetPostProduction: () => {
    set({ postProduction: { ...DEFAULT_POST_PRODUCTION } });
  },

  generateCaption: async (platform = 'instagram') => {
    const { selectedGeneration } = get();
    if (!selectedGeneration) return;

    try {
      const result = await apiGenerateCaption(selectedGeneration.prompt, platform);

      set(state => ({
        postProduction: {
          ...state.postProduction,
          caption:  result.caption  || '',
          hashtags: normalizeHashtags(result.hashtags || []),
        },
      }));

      return result;
    } catch (err) {
      console.error('generateCaption:', err);
      throw err;
    }
  },

  optimizeCaption: async () => {
    const { postProduction } = get();

    try {
      const result = await apiOptimizeSEO(
        postProduction.caption,
        postProduction.hashtags,
      );

      set(state => ({
        postProduction: {
          ...state.postProduction,
          caption:  result.optimizedCaption  || state.postProduction.caption,
          hashtags: normalizeHashtags(result.optimizedHashtags || state.postProduction.hashtags),
          seoScore: result.seoScore || 0,
        },
      }));

      return result;
    } catch (err) {
      console.error('optimizeCaption:', err);
      throw err;
    }
  },

  updatePostProduction: (updates) => {
    set(state => ({
      postProduction: { ...state.postProduction, ...updates },
    }));
  },

  publishContent: async () => {
    const { selectedGeneration, postProduction } = get();
    if (!selectedGeneration) throw new Error('No generation selected');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Normalize hashtags before joining
      const normalizedTags = normalizeHashtags(postProduction.hashtags);
      const hashtagString  = normalizedTags.join(' ');
      const finalCaption   = postProduction.caption.trim()
        + (hashtagString ? `\n\n${hashtagString}` : '');

      const scheduleDate = postProduction.scheduleDate || new Date().toISOString();
      // FIXED: was incorrectly checking === 'posted', which never matches
      const status = postProduction.scheduleDate
        ? POST_STATUS.SCHEDULED
        : POST_STATUS.PUBLISHED;

      const posts = postProduction.selectedPlatforms.map(accountId => ({
        user_id:       user.id,
        generation_id: selectedGeneration.id,
        account_id:    accountId,
        caption:       finalCaption,
        scheduled_at:  scheduleDate,
        status,
      }));

      const { error } = await supabase.from('posts').insert(posts);
      if (error) throw error;

      // Reset post-production state on success
      set({
        selectedGeneration: null,
        postProduction: { ...DEFAULT_POST_PRODUCTION },
      });

      // FIXED: correct success message (was always 'Scheduled' due to 'posted' check)
      return {
        success: true,
        message: status === POST_STATUS.PUBLISHED
          ? 'Posted successfully!'
          : 'Scheduled successfully!',
        status,
      };
    } catch (err) {
      console.error('publishContent:', err);
      throw err;
    }
  },


  // -- SETTINGS -------------------------------------------------------------

  updateSettings: (updates) => {
    set(state => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  setClarifications: (clarifications) => {
    set({ pendingClarifications: clarifications ?? {} });
  },

  setPendingClarifications: (clarifications) => {
    set({ pendingClarifications: clarifications ?? {} });
  },

  clearClarifications: () => {
    set({ pendingClarifications: {} });
  },

  clearError: () => set({ error: null }),


  // -- REALTIME --------------------------------------------------------------

  subscribeToGenerations: (callback) => {
    const channel = supabase
      .channel('generations_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generations' },
        (payload) => {
          const { activeSession } = get();

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new;

            // Only apply if it belongs to the current session
            if (updated.session_id === activeSession?.id) {
              set(state => {
                const exists = state.activeGenerations.find(g => g.id === updated.id);
                return {
                  activeGenerations: exists
                    ? state.activeGenerations.map(g => g.id === updated.id ? updated : g)
                    : [...state.activeGenerations, updated],
                };
              });
            }
          }

          if (typeof callback === 'function') callback(payload);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },


  // -- CLEANUP ---------------------------------------------------------------

  reset: () => {
    set({
      sessions:           [],
      activeSession:      null,
      activeGenerations:  [],
      selectedGeneration: null,
      isGenerating:       false,
      generationProgress: 0,
      generationStage:    null,
      pendingClarifications: {},
      error:              null,
      postProduction:     { ...DEFAULT_POST_PRODUCTION },
    });
  },
}));

export default useSessionStore;
