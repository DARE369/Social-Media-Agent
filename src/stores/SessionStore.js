// ============================================================================
// ZUSTAND SESSION STORE - SocialAI
// Freepik-backed image/video/edit flows + async video polling state
// ============================================================================

import { create } from 'zustand';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { POST_STATUS, GENERATION_STATUS } from '../constants/statusEnums';
import {
  generateImages,
  editImage,
  createVideoJob,
  checkVideoJobStatus,
} from '../services/freepik.service';
import {
  enhancePrompt as apiEnhancePrompt,
  generateCaption as apiGenerateCaption,
  optimizeForSEO as apiOptimizeSEO,
} from '../services/ApiService';
import { loadBrandKit } from '../services/brandKitLoader';

export { GENERATION_STATUS, POST_STATUS } from '../constants/statusEnums';

const VIDEO_POLL_INTERVAL_MS = 8000;

const DEFAULT_POST_PRODUCTION = {
  caption: '',
  hashtags: [],
  seoScore: 0,
  selectedPlatforms: [],
  scheduleDate: null,
};

const DEFAULT_VIDEO_JOB_STATE = {
  jobId: null,
  generationId: null,
  prompt: '',
  status: null, // submitting | processing | completed | failed | null
  progress: 0,
  videoUrl: null,
  isMinimized: false,
  pollInterval: null,
};

const normalizeHashtags = (tags = []) => tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

const STAGE_PROGRESS = {
  'Loading brand kit...': { pct: 5, label: 'Loading brand kit...' },
  'Planning content...': { pct: 15, label: 'Planning your content...' },
  'Generating content plan...': { pct: 30, label: 'Generating content plan...' },
  'Quality check...': { pct: 40, label: 'Checking brand guardrails...' },
  'Generating image...': { pct: 60, label: 'Creating your image...' },
};

const mapStageProgress = (stage = '') => {
  if (STAGE_PROGRESS[stage]) return STAGE_PROGRESS[stage];
  if (stage.startsWith('Generating slide')) return { pct: 62, label: stage };
  return { pct: 50, label: stage || 'Generating...' };
};

async function fetchSessionGenerations(sessionId) {
  if (!sessionId) return [];
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function ensureSession(get, userInput) {
  const { activeSession, createSession } = get();
  if (activeSession?.id) return activeSession;
  const autoTitle = userInput.slice(0, 50) + (userInput.length > 50 ? '...' : '');
  return createSession(autoTitle);
}

const useSessionStore = create((set, get) => ({
  // -- STATE ------------------------------------------------------------------
  sessions: [],
  activeSession: null,
  activeGenerations: [],
  selectedGeneration: null,

  isGenerating: false,
  generationProgress: 0,
  progressLabel: null,
  generationStage: null,
  pendingClarifications: {},
  error: null,

  videoJobState: { ...DEFAULT_VIDEO_JOB_STATE },

  settings: {
    mediaType: 'image', // image | video | edit
    aspectRatio: '1:1',
    batchSize: 1,
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

      set((state) => ({
        sessions: [data, ...state.sessions],
        activeSession: data,
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
      const session = get().sessions.find((item) => item.id === sessionId);
      if (!session) throw new Error('Session not found');
      const generations = await fetchSessionGenerations(sessionId);

      set({
        activeSession: session,
        activeGenerations: generations,
        selectedGeneration: null,
        error: null,
      });
    } catch (err) {
      console.error('switchSession:', err);
      set({ error: err.message });
    }
  },

  deleteSession: async (sessionId) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;

      set((state) => ({
        sessions: state.sessions.filter((item) => item.id !== sessionId),
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

      set((state) => ({
        sessions: state.sessions.map((item) => (item.id === sessionId ? { ...item, title } : item)),
        activeSession: state.activeSession?.id === sessionId
          ? { ...state.activeSession, title }
          : state.activeSession,
      }));
    } catch (err) {
      console.error('updateSessionTitle:', err);
    }
  },

  // -- GENERATION ACTIONS ----------------------------------------------------
  startGeneration: async (userInput) => {
    const prompt = String(userInput || '').trim();
    if (!prompt) return;

    const { settings } = get();

    if (settings.mediaType === 'video') {
      await get().startVideoGeneration(prompt);
      return;
    }

    if (settings.mediaType === 'edit') {
      throw new Error('Edit mode requires a source image. Use startEditGeneration.');
    }

    set({
      isGenerating: true,
      error: null,
      generationProgress: 0,
      progressLabel: 'Preparing generation...',
      generationStage: null,
    });

    try {
      const session = await ensureSession(get, prompt);
      const { pendingClarifications } = get();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const brandKit = await loadBrandKit(user.id);
      const { registerImageGenerator, runGenerationPipeline } = await import('../services/generationPipeline');

      registerImageGenerator(async (promptText, aspectRatio) => {
        set({
          generationProgress: 68,
          progressLabel: 'Requesting Freepik image...',
          generationStage: 'Generating image...',
        });

        const images = await generateImages({
          prompt: promptText,
          aspectRatio,
          numImages: 1,
          brandKit,
        });

        const first = images?.[0];
        if (!first?.url) throw new Error('Freepik returned no image URL');

        set({
          generationProgress: 90,
          progressLabel: 'Uploading to Supabase storage...',
          generationStage: 'Uploading...',
        });

        return first.url;
      });

      await runGenerationPipeline({
        userInput: prompt,
        clarifications: pendingClarifications ?? {},
        sessionId: session.id,
        userId: user.id,
        settings: {
          ...settings,
          contentType: settings.contentType ?? 'single',
          mediaType: 'image',
        },
        onProgress: (stage) => {
          const mapped = mapStageProgress(stage);
          set({
            generationProgress: mapped.pct,
            progressLabel: mapped.label,
            generationStage: stage,
          });
        },
      });

      await supabase
        .from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id);

      const refreshed = await fetchSessionGenerations(session.id);
      set({
        activeGenerations: refreshed,
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
        progressLabel: null,
        generationStage: null,
      });
    }
  },

  startEditGeneration: async (sourceImageUrl, instruction) => {
    const cleanSource = String(sourceImageUrl || '').trim();
    const prompt = String(instruction || '').trim();

    if (!cleanSource) throw new Error('Source image is required for edit mode');
    if (!prompt) throw new Error('Edit instruction is required');

    set({
      isGenerating: true,
      error: null,
      generationProgress: 8,
      progressLabel: 'Preparing edit...',
      generationStage: 'Preparing',
    });

    let createdGeneration = null;

    try {
      const session = await ensureSession(get, prompt);
      const { settings } = get();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const brandKit = await loadBrandKit(user.id);

      const { data: created, error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          session_id: session.id,
          prompt,
          media_type: 'image',
          status: GENERATION_STATUS.PROCESSING,
          progress: 10,
          metadata: {
            edit_mode: true,
            source_image_url: cleanSource,
            aspect_ratio: settings.aspectRatio,
            provider: 'freepik',
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;
      createdGeneration = created;

      set((state) => ({
        activeGenerations: [...state.activeGenerations, created],
        generationProgress: 35,
        progressLabel: 'Applying Freepik edit...',
        generationStage: 'Editing image...',
      }));

      const edited = await editImage({
        prompt,
        sourceImageUrl: cleanSource,
        brandKit,
        aspectRatio: settings.aspectRatio,
      });

      set({
        generationProgress: 88,
        progressLabel: 'Saving edited image...',
        generationStage: 'Uploading...',
      });

      const metadata = {
        ...(created.metadata || {}),
        width: edited.width,
        height: edited.height,
        provider: edited.provider || 'freepik',
        freepik_task_id: edited.taskId || null,
      };

      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: GENERATION_STATUS.COMPLETED,
          progress: 100,
          storage_path: edited.url,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', created.id);

      if (updateError) throw updateError;

      await supabase
        .from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id);

      const refreshed = await fetchSessionGenerations(session.id);
      set({
        activeGenerations: refreshed,
        error: null,
      });
    } catch (err) {
      console.error('startEditGeneration error:', err);
      if (createdGeneration?.id) {
        await supabase
          .from('generations')
          .update({
            status: GENERATION_STATUS.FAILED,
            updated_at: new Date().toISOString(),
          })
          .eq('id', createdGeneration.id);
      }
      set({ error: err.message });
      throw err;
    } finally {
      set({
        isGenerating: false,
        generationProgress: 0,
        progressLabel: null,
        generationStage: null,
      });
    }
  },

  startVideoGeneration: async (userInput) => {
    const prompt = String(userInput || '').trim();
    if (!prompt) return;

    const existingInterval = get().videoJobState.pollInterval;
    if (existingInterval) clearInterval(existingInterval);

    set((state) => ({
      isGenerating: true,
      error: null,
      generationProgress: 10,
      progressLabel: 'Queuing video job...',
      generationStage: 'Video queued',
      videoJobState: {
        ...state.videoJobState,
        ...DEFAULT_VIDEO_JOB_STATE,
        status: 'submitting',
        prompt,
        progress: 10,
      },
    }));

    try {
      const session = await ensureSession(get, prompt);
      const { settings } = get();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const brandKit = await loadBrandKit(user.id);
      const videoJob = await createVideoJob({
        prompt,
        aspectRatio: settings.aspectRatio,
        duration: 5,
        brandKit,
      });

      const { data: created, error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          session_id: session.id,
          prompt,
          media_type: 'video',
          status: GENERATION_STATUS.PROCESSING,
          progress: 12,
          metadata: {
            provider: 'freepik',
            freepik_job_id: videoJob.jobId,
            aspect_ratio: settings.aspectRatio,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      set((state) => ({
        activeGenerations: [...state.activeGenerations, created],
        generationProgress: 15,
        progressLabel: 'Video job started...',
        generationStage: 'Processing video...',
        videoJobState: {
          ...state.videoJobState,
          status: 'processing',
          jobId: videoJob.jobId,
          generationId: created.id,
          progress: 15,
        },
      }));

      await supabase
        .from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id);

      get().startVideoPolling(videoJob.jobId, created.id);
    } catch (err) {
      console.error('startVideoGeneration error:', err);
      set((state) => ({
        isGenerating: false,
        generationProgress: 0,
        progressLabel: null,
        generationStage: null,
        error: err.message,
        videoJobState: {
          ...state.videoJobState,
          status: 'failed',
          progress: 100,
          pollInterval: null,
        },
      }));
      throw err;
    }
  },

  startVideoPolling: (jobId, generationId) => {
    if (!jobId) return;

    const existingInterval = get().videoJobState.pollInterval;
    if (existingInterval) clearInterval(existingInterval);

    const pollOnce = async () => {
      try {
        const result = await checkVideoJobStatus({ jobId, generationId });
        const nextProgress = Math.max(10, Math.min(100, result.progress || 0));

        if (result.status === 'processing') {
          set((state) => ({
            isGenerating: true,
            generationProgress: nextProgress,
            progressLabel: 'Generating video...',
            generationStage: 'Processing video...',
            videoJobState: {
              ...state.videoJobState,
              status: 'processing',
              progress: nextProgress,
              videoUrl: null,
            },
          }));
          return;
        }

        if (result.status === 'completed') {
          const intervalRef = get().videoJobState.pollInterval;
          if (intervalRef) clearInterval(intervalRef);

          set((state) => ({
            isGenerating: false,
            generationProgress: 100,
            progressLabel: 'Video completed',
            generationStage: 'Completed',
            activeGenerations: state.activeGenerations.map((generation) => (
              generation.id === generationId
                ? {
                    ...generation,
                    status: GENERATION_STATUS.COMPLETED,
                    progress: 100,
                    storage_path: result.videoUrl || generation.storage_path,
                  }
                : generation
            )),
            videoJobState: {
              ...state.videoJobState,
              status: 'completed',
              progress: 100,
              videoUrl: result.videoUrl,
              pollInterval: null,
            },
          }));

          const { activeSession } = get();
          if (activeSession?.id) {
            const refreshed = await fetchSessionGenerations(activeSession.id);
            set({ activeGenerations: refreshed });
          }
          return;
        }

        const intervalRef = get().videoJobState.pollInterval;
        if (intervalRef) clearInterval(intervalRef);

        const isMinimized = get().videoJobState.isMinimized;
        if (isMinimized) {
          toast.error('Video generation failed. Expand the status bar to retry.', { duration: 8000 });
        }

        set((state) => ({
          isGenerating: false,
          generationProgress: 0,
          progressLabel: null,
          generationStage: null,
          error: result.error || 'Video generation failed',
          videoJobState: {
            ...state.videoJobState,
            status: 'failed',
            progress: 100,
            pollInterval: null,
          },
        }));
      } catch (err) {
        console.error('[VideoPolling] Error:', err);
      }
    };

    const intervalId = setInterval(pollOnce, VIDEO_POLL_INTERVAL_MS);
    set((state) => ({
      videoJobState: {
        ...state.videoJobState,
        jobId,
        generationId,
        pollInterval: intervalId,
      },
    }));

    pollOnce();
  },

  dismissVideoJob: () => {
    const pollInterval = get().videoJobState.pollInterval;
    if (pollInterval) clearInterval(pollInterval);

    set({
      isGenerating: false,
      videoJobState: { ...DEFAULT_VIDEO_JOB_STATE },
      generationProgress: 0,
      progressLabel: null,
      generationStage: null,
    });
  },

  setVideoJobMinimized: (isMinimized) => {
    set((state) => ({
      videoJobState: {
        ...state.videoJobState,
        isMinimized: Boolean(isMinimized),
      },
    }));
  },

  enhancePrompt: async (prompt) => {
    try {
      return await apiEnhancePrompt(prompt);
    } catch (err) {
      console.error('enhancePrompt:', err);
      return prompt;
    }
  },

  // -- POST-PRODUCTION -------------------------------------------------------
  selectGeneration: (generation) => {
    set({ selectedGeneration: generation });
  },

  resetPostProduction: () => {
    set({ postProduction: { ...DEFAULT_POST_PRODUCTION } });
  },

  generateCaption: async (platform = 'instagram') => {
    const { selectedGeneration } = get();
    if (!selectedGeneration) return;

    try {
      const result = await apiGenerateCaption(selectedGeneration.prompt, platform);
      set((state) => ({
        postProduction: {
          ...state.postProduction,
          caption: result.caption || '',
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
      const result = await apiOptimizeSEO(postProduction.caption, postProduction.hashtags);
      set((state) => ({
        postProduction: {
          ...state.postProduction,
          caption: result.optimizedCaption || state.postProduction.caption,
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
    set((state) => ({
      postProduction: { ...state.postProduction, ...updates },
    }));
  },

  publishContent: async () => {
    const { selectedGeneration, postProduction } = get();
    if (!selectedGeneration) throw new Error('No generation selected');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const normalizedTags = normalizeHashtags(postProduction.hashtags);
      const hashtagString = normalizedTags.join(' ');
      const finalCaption = postProduction.caption.trim()
        + (hashtagString ? `\n\n${hashtagString}` : '');

      const scheduleDate = postProduction.scheduleDate || new Date().toISOString();
      const status = postProduction.scheduleDate ? POST_STATUS.SCHEDULED : POST_STATUS.PUBLISHED;

      const posts = postProduction.selectedPlatforms.map((accountId) => ({
        user_id: user.id,
        generation_id: selectedGeneration.id,
        account_id: accountId,
        caption: finalCaption,
        scheduled_at: scheduleDate,
        status,
      }));

      const { error } = await supabase.from('posts').insert(posts);
      if (error) throw error;

      set({
        selectedGeneration: null,
        postProduction: { ...DEFAULT_POST_PRODUCTION },
      });

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

  // -- SETTINGS ---------------------------------------------------------------
  updateSettings: (updates) => {
    set((state) => ({
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

  // -- REALTIME ---------------------------------------------------------------
  subscribeToGenerations: (callback) => {
    const channel = supabase
      .channel('generations_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generations' },
        (payload) => {
          const { activeSession, videoJobState } = get();

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new;

            if (updated.session_id === activeSession?.id) {
              set((state) => {
                const exists = state.activeGenerations.find((generation) => generation.id === updated.id);
                return {
                  activeGenerations: exists
                    ? state.activeGenerations.map((generation) => (generation.id === updated.id ? updated : generation))
                    : [...state.activeGenerations, updated],
                };
              });
            }

            if (videoJobState.generationId && updated.id === videoJobState.generationId) {
              if (updated.status === GENERATION_STATUS.COMPLETED && updated.storage_path) {
                const pollInterval = videoJobState.pollInterval;
                if (pollInterval) clearInterval(pollInterval);

                set((state) => ({
                  isGenerating: false,
                  generationProgress: 100,
                  progressLabel: 'Video completed',
                  generationStage: 'Completed',
                  videoJobState: {
                    ...state.videoJobState,
                    status: 'completed',
                    progress: 100,
                    videoUrl: updated.storage_path,
                    pollInterval: null,
                  },
                }));
              }

              if (updated.status === GENERATION_STATUS.FAILED) {
                const pollInterval = videoJobState.pollInterval;
                if (pollInterval) clearInterval(pollInterval);

                set((state) => ({
                  isGenerating: false,
                  generationProgress: 0,
                  progressLabel: null,
                  generationStage: null,
                  videoJobState: {
                    ...state.videoJobState,
                    status: 'failed',
                    progress: 100,
                    pollInterval: null,
                  },
                }));
              }
            }
          }

          if (typeof callback === 'function') callback(payload);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // -- CLEANUP ----------------------------------------------------------------
  reset: () => {
    const pollInterval = get().videoJobState.pollInterval;
    if (pollInterval) clearInterval(pollInterval);

    set({
      sessions: [],
      activeSession: null,
      activeGenerations: [],
      selectedGeneration: null,
      isGenerating: false,
      generationProgress: 0,
      progressLabel: null,
      generationStage: null,
      pendingClarifications: {},
      error: null,
      videoJobState: { ...DEFAULT_VIDEO_JOB_STATE },
      postProduction: { ...DEFAULT_POST_PRODUCTION },
    });
  },
}));

export default useSessionStore;
