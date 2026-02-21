// ============================================================================
// CALENDAR STORE - Zustand State Management
// Manages posts, drafts, ghost slots, and calendar settings
// ============================================================================

import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

const useCalendarStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  
  posts: [],
  drafts: [],
  ghostSlots: [],
  contentPillars: [],
  optimalTimes: [],
  calendarSettings: null,
  
  viewMode: 'month', // 'month', 'week', 'day'
  selectedDate: new Date(),
  
  loading: false,
  error: null,

  // ============================================================================
  // POSTS MANAGEMENT
  // ============================================================================
  
  /**
   * Fetch all scheduled posts for current user
   */
  fetchPosts: async () => {
    try {
      set({ loading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          connected_accounts ( platform, account_name, avatar_url ),
          generations ( storage_path, media_type, prompt )
        `)
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'published', 'publishing', 'failed'])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      
      set({ posts: data || [], loading: false });
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      set({ error: error.message, loading: false });
    }
  },

  /**
   * Fetch unscheduled drafts
   */
  fetchDrafts: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          generations ( storage_path, media_type, prompt )
        `)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      set({ drafts: data || [] });
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
      set({ error: error.message });
    }
  },

  /**
   * Create a new post
   */
  createPost: async (postData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          ...postData,
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh lists
      get().fetchPosts();
      get().fetchDrafts();

      return data;
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  },

  /**
   * Update an existing post
   */
  updatePost: async (postId, updates) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        posts: state.posts.map(p => p.id === postId ? { ...p, ...updates } : p),
      }));

      return true;
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  },

  /**
   * Delete a post
   */
  deletePost: async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        posts: state.posts.filter(p => p.id !== postId),
        drafts: state.drafts.filter(d => d.id !== postId),
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  },

  // ============================================================================
  // GHOST SLOTS (AI SUGGESTIONS)
  // ============================================================================
  
  /**
   * Fetch active ghost slots
   */
  fetchGhostSlots: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ghost_slots')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'suggested')
        .gte('expires_at', new Date().toISOString())
        .order('suggested_date', { ascending: true });

      if (error) throw error;
      
      set({ ghostSlots: data || [] });
    } catch (error) {
      console.error('Failed to fetch ghost slots:', error);
      set({ error: error.message });
    }
  },

  /**
   * Accept a ghost slot (convert to draft/scheduled post)
   */
  acceptGhostSlot: async (ghostSlotId, postData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create post from ghost slot
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          ...postData,
        }])
        .select()
        .single();

      if (postError) throw postError;

      // Mark ghost slot as accepted
      const { error: updateError } = await supabase
        .from('ghost_slots')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', ghostSlotId);

      if (updateError) throw updateError;

      // Refresh data
      get().fetchPosts();
      get().fetchGhostSlots();

      return newPost;
    } catch (error) {
      console.error('Failed to accept ghost slot:', error);
      throw error;
    }
  },

  // ============================================================================
  // CONTENT PILLARS
  // ============================================================================
  
  /**
   * Fetch user's content pillars
   */
  fetchContentPillars: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('content_pillars')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      
      set({ contentPillars: data || [] });
    } catch (error) {
      console.error('Failed to fetch content pillars:', error);
      set({ error: error.message });
    }
  },

  /**
   * Create a new content pillar
   */
  createContentPillar: async (pillarData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('content_pillars')
        .insert([{
          user_id: user.id,
          ...pillarData,
        }])
        .select()
        .single();

      if (error) throw error;

      get().fetchContentPillars();
      return data;
    } catch (error) {
      console.error('Failed to create content pillar:', error);
      throw error;
    }
  },

  // ============================================================================
  // OPTIMAL POSTING TIMES
  // ============================================================================
  
  /**
   * Fetch optimal posting times for user
   */
  fetchOptimalTimes: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('optimal_posting_times')
        .select('*')
        .eq('user_id', user.id)
        .gte('sample_size', 3) // Only show times with enough data
        .order('score', { ascending: false });

      if (error) throw error;
      
      set({ optimalTimes: data || [] });
    } catch (error) {
      console.error('Failed to fetch optimal times:', error);
      set({ error: error.message });
    }
  },

  /**
   * Get best posting time for a specific platform and date
   */
  getBestTimeForDate: async (platform, targetDate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call Supabase function
      const { data, error } = await supabase.rpc('get_best_posting_time', {
        p_user_id: user.id,
        p_platform: platform,
        p_target_date: targetDate.toISOString().split('T')[0],
      });

      if (error) throw error;
      
      return new Date(data);
    } catch (error) {
      console.error('Failed to get best time:', error);
      
      // Return default best times
      const hour = {
        'instagram': 11,
        'tiktok': 15,
        'youtube': 14,
        'facebook': 13,
      }[platform] || 12;
      
      const bestTime = new Date(targetDate);
      bestTime.setHours(hour, 0, 0, 0);
      return bestTime;
    }
  },

  // ============================================================================
  // CALENDAR SETTINGS
  // ============================================================================
  
  /**
   * Fetch user's calendar settings
   */
  fetchCalendarSettings: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Create default settings if none exist
      if (!data) {
        const { data: newSettings, error: createError } = await supabase
          .from('calendar_settings')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (createError) throw createError;
        set({ calendarSettings: newSettings });
      } else {
        set({ calendarSettings: data });
      }
    } catch (error) {
      console.error('Failed to fetch calendar settings:', error);
      set({ error: error.message });
    }
  },

  /**
   * Update calendar settings
   */
  updateCalendarSettings: async (updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('calendar_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      set((state) => ({
        calendarSettings: {
          ...state.calendarSettings,
          ...updates,
        },
      }));

      return true;
    } catch (error) {
      console.error('Failed to update calendar settings:', error);
      throw error;
    }
  },

  // ============================================================================
  // UI STATE
  // ============================================================================
  
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================
  
  /**
   * Subscribe to realtime updates for posts
   */
  subscribeToUpdates: () => {
    const channel = supabase
      .channel('calendar_updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts',
        },
        (payload) => {
          console.log('📡 Calendar update:', payload);
          
          // Refresh data on any change
          get().fetchPosts();
          get().fetchDrafts();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ghost_slots',
        },
        (payload) => {
          console.log('👻 Ghost slots update:', payload);
          get().fetchGhostSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  reset: () => {
    set({
      posts: [],
      drafts: [],
      ghostSlots: [],
      contentPillars: [],
      optimalTimes: [],
      calendarSettings: null,
      viewMode: 'month',
      selectedDate: new Date(),
      loading: false,
      error: null,
    });
  },
}));

export default useCalendarStore;
