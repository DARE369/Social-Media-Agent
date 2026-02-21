// ============================================================================
// FILE: src/services/MockOAuthService.js
// ============================================================================
// Purpose: Simulates OAuth connection flow for development/testing
// 
// Why Mock OAuth?
// - Allows building entire UI without waiting for real API credentials
// - Simulates realistic delays and responses
// - Creates database records matching real OAuth structure
// - Easy to swap for real OAuth later (same method signatures)
//
// Supported Platforms: Instagram, TikTok, YouTube
// ============================================================================

import { supabase } from './supabaseClient';

// ============================================================================
// MOCK DATA CONFIGURATION
// ============================================================================
// Realistic sample data for each platform to simulate real accounts

const MOCK_USER_DATA = {
  // Instagram mock accounts
  instagram: {
    // Sample usernames to randomly select from
    usernames: [
      'creative_studio', 
      'design.daily', 
      'content.creator', 
      'social.pro', 
      'insta.marketer',
      'digital.artist',
      'photo.enthusiast',
      'brand.builder'
    ],
    // Public avatar URLs (using pravatar.cc - free avatar service)
    profilePics: [
      'https://i.pravatar.cc/150?img=1',
      'https://i.pravatar.cc/150?img=2',
      'https://i.pravatar.cc/150?img=3',
      'https://i.pravatar.cc/150?img=10',
      'https://i.pravatar.cc/150?img=11'
    ]
  },

  // TikTok mock accounts
  tiktok: {
    usernames: [
      'viral_content', 
      'tiktok_pro', 
      'short.videos', 
      'trending.daily', 
      'content.king',
      'creator.hub',
      'dance.moves',
      'comedy.central'
    ],
    profilePics: [
      'https://i.pravatar.cc/150?img=4',
      'https://i.pravatar.cc/150?img=5',
      'https://i.pravatar.cc/150?img=6',
      'https://i.pravatar.cc/150?img=12',
      'https://i.pravatar.cc/150?img=13'
    ]
  },

  // YouTube mock accounts
  youtube: {
    usernames: [
      'My YouTube Channel',
      'Content Creator Studio',
      'Video Productions',
      'Creator Hub',
      'Media Channel',
      'Tech Reviews',
      'Gaming Central',
      'Vlog Life'
    ],
    profilePics: [
      'https://i.pravatar.cc/150?img=7',
      'https://i.pravatar.cc/150?img=8',
      'https://i.pravatar.cc/150?img=9',
      'https://i.pravatar.cc/150?img=14',
      'https://i.pravatar.cc/150?img=15'
    ]
  }
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class MockOAuthService {
  
  /**
   * ========================================================================
   * CONNECT MOCK ACCOUNT
   * ========================================================================
   * Simulates the OAuth connection flow with realistic delays
   * 
   * Flow:
   * 1. Simulate OAuth redirect (2 second delay)
   * 2. Generate realistic mock user data
   * 3. Insert into database with status='mock'
   * 4. Return success response
   * 
   * @param {string} platform - 'instagram' | 'tiktok' | 'youtube'
   * @param {string} userId - Current user's ID from auth
   * @returns {Promise<{success: boolean, data: object, message: string}>}
   */
  static async connectMockAccount(platform, userId) {
    try {
      // ----------------------------------------------------------------
      // STEP 1: Simulate OAuth Redirect Delay
      // ----------------------------------------------------------------
      // Real OAuth involves:
      // - Redirect to platform (Instagram/TikTok/YouTube)
      // - User grants permissions
      // - Redirect back with code
      // - Exchange code for token
      // This takes 2-5 seconds in real life, so we simulate that
      console.log(`[MockOAuth] Starting ${platform} connection for user ${userId}...`);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

      // ----------------------------------------------------------------
      // STEP 2: Generate Mock User Data
      // ----------------------------------------------------------------
      // Create realistic platform account data
      const mockData = this.generateMockUserData(platform);

      console.log(`[MockOAuth] Generated mock data for ${platform}:`, mockData);

      // ----------------------------------------------------------------
      // STEP 3: Insert into Database
      // ----------------------------------------------------------------
      // Create the connected_accounts record
      const { data, error } = await supabase
        .from('connected_accounts')
        .insert({
          // Link to current user
          user_id: userId,
          
          // Platform identifier
          platform: platform,
          
          // Legacy field (for backwards compatibility)
          account_name: mockData.username,
          
          // Platform's unique ID for this account
          account_id: mockData.id,
          
          // Display username (e.g., @creative_studio)
          username: mockData.username,
          
          // Profile picture URL
          avatar_url: mockData.profilePicture,
          
          // Mock token (not real, just for consistency)
          access_token: `mock_token_${platform}_${Date.now()}`,
          
          // Token expiration (30 days from now)
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          
          // OAuth scopes this account has granted
          scopes: mockData.scopes,
          
          // Mark as mock for development
          connection_status: 'mock',
          
          // Platform-specific metadata (followers, posts, etc.)
          platform_metadata: {
            mock: true, // Flag to identify mock accounts
            created_at: new Date().toISOString(),
            ...mockData.metadata
          },
          
          // Track when token was last refreshed
          last_token_refresh: new Date(),

          // Mirror avatar_url to profile_picture_url (new schema)
          profile_picture_url: mockData.profilePicture
        })
        .select() // Return the inserted row
        .single(); // Expect single row

      // ----------------------------------------------------------------
      // STEP 4: Handle Errors
      // ----------------------------------------------------------------
      if (error) {
        console.error(`[MockOAuth] Database error:`, error);
        throw error;
      }

      console.log(`[MockOAuth] Successfully connected ${platform} account:`, data);

      // ----------------------------------------------------------------
      // STEP 5: Return Success Response
      // ----------------------------------------------------------------
      return {
        success: true,
        data: data,
        message: `Mock ${platform} account connected successfully`
      };

    } catch (error) {
      console.error(`[MockOAuth] Failed to connect ${platform}:`, error);
      
      return {
        success: false,
        data: null,
        message: error.message || `Failed to connect ${platform} account`
      };
    }
  }

  /**
   * ========================================================================
   * GENERATE MOCK USER DATA
   * ========================================================================
   * Creates realistic platform-specific account data
   * 
   * @param {string} platform - 'instagram' | 'tiktok' | 'youtube'
   * @returns {object} Mock account data matching real API response structure
   */
  static generateMockUserData(platform) {
    // Get platform-specific data arrays
    const platformData = MOCK_USER_DATA[platform];
    
    // Randomly select username from pool
    const randomUsername = platformData.usernames[
      Math.floor(Math.random() * platformData.usernames.length)
    ];
    
    // Randomly select profile picture
    const randomPic = platformData.profilePics[
      Math.floor(Math.random() * platformData.profilePics.length)
    ];

    // ----------------------------------------------------------------
    // Base data common to all platforms
    // ----------------------------------------------------------------
    const baseData = {
      // Generate unique mock ID for this platform
      // Format: mock_{platform}_{random9chars}
      id: `mock_${platform}_${Math.random().toString(36).substr(2, 9)}`,
      
      username: randomUsername,
      profilePicture: randomPic,
    };

    // ----------------------------------------------------------------
    // Platform-Specific Data
    // ----------------------------------------------------------------
    // Each platform has different fields and metadata structures
    
    switch (platform) {
      case 'instagram':
        return {
          ...baseData,
          
          // OAuth scopes Instagram provides
          scopes: ['instagram_basic', 'instagram_content_publish'],
          
          // Instagram-specific metadata
          metadata: {
            account_type: 'BUSINESS', // PERSONAL, CREATOR, or BUSINESS
            
            // Random follower count between 1,000 and 50,000
            followers_count: Math.floor(Math.random() * 49000) + 1000,
            
            // Random media count (posts) between 50 and 500
            media_count: Math.floor(Math.random() * 450) + 50,
            
            // Following count
            following_count: Math.floor(Math.random() * 1000) + 100
          }
        };

      case 'tiktok':
        return {
          ...baseData,
          
          // TikTok OAuth scopes
          scopes: ['user.info.basic', 'video.upload', 'video.publish'],
          
          // TikTok-specific metadata
          metadata: {
            display_name: randomUsername,
            
            // Random follower count between 500 and 100,000
            follower_count: Math.floor(Math.random() * 99500) + 500,
            
            // Random video count between 10 and 200
            video_count: Math.floor(Math.random() * 190) + 10,
            
            // Engagement metrics
            total_likes: Math.floor(Math.random() * 500000) + 10000
          }
        };

      case 'youtube':
        return {
          ...baseData,
          
          // YouTube OAuth scopes
          scopes: ['youtube.upload', 'youtube.readonly'],
          
          // YouTube-specific metadata
          metadata: {
            // YouTube channel ID format
            channel_id: `UC${Math.random().toString(36).substr(2, 20)}`,
            
            // Random subscriber count between 100 and 10,000
            subscriber_count: Math.floor(Math.random() * 9900) + 100,
            
            // Random video count between 5 and 100
            video_count: Math.floor(Math.random() * 95) + 5,
            
            // Total view count
            view_count: Math.floor(Math.random() * 1000000) + 50000
          }
        };

      default:
        // Fallback for unknown platforms
        return baseData;
    }
  }

  /**
   * ========================================================================
   * DISCONNECT ACCOUNT
   * ========================================================================
   * Marks an account as revoked (disconnected)
   * 
   * Note: We don't delete the record to preserve history
   * Instead, we mark it as 'revoked' so it won't appear in active lists
   * 
   * @param {string} accountId - UUID of connected_accounts record
   * @returns {Promise<{success: boolean}>}
   */
  static async disconnectAccount(accountId) {
    try {
      console.log(`[MockOAuth] Disconnecting account ${accountId}...`);

      // ----------------------------------------------------------------
      // Update connection_status to 'revoked'
      // ----------------------------------------------------------------
      const { error } = await supabase
        .from('connected_accounts')
        .update({ 
          connection_status: 'revoked',
          // Also clear sensitive data
          access_token: null,
          access_meta: null
        })
        .eq('id', accountId);

      if (error) {
        console.error(`[MockOAuth] Disconnect error:`, error);
        throw error;
      }

      console.log(`[MockOAuth] Successfully disconnected account ${accountId}`);

      return { success: true };

    } catch (error) {
      console.error(`[MockOAuth] Failed to disconnect account:`, error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * GET CONNECTED ACCOUNTS
   * ========================================================================
   * Fetches all active connected accounts for a user
   * 
   * Filters:
   * - Only accounts belonging to current user
   * - Excludes revoked accounts
   * - Orders by most recent first
   * 
   * @param {string} userId - Current user's ID
   * @returns {Promise<Array>} Array of connected account objects
   */
  static async getConnectedAccounts(userId) {
    try {
      console.log(`[MockOAuth] Fetching connected accounts for user ${userId}...`);

      // ----------------------------------------------------------------
      // Query Database
      // ----------------------------------------------------------------
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*') // Get all columns
        .eq('user_id', userId) // Only this user's accounts
        .in('connection_status', ['active', 'mock', 'expired']) // Exclude revoked
        .order('created_at', { ascending: false }); // Newest first

      if (error) {
        console.error(`[MockOAuth] Fetch error:`, error);
        throw error;
      }

      console.log(`[MockOAuth] Found ${data?.length || 0} connected accounts`);

      return data || [];

    } catch (error) {
      console.error(`[MockOAuth] Failed to fetch accounts:`, error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * REFRESH MOCK TOKEN
   * ========================================================================
   * Simulates OAuth token refresh
   * 
   * In real OAuth:
   * - Tokens expire after X hours/days
   * - Must use refresh_token to get new access_token
   * - Updates expires_at timestamp
   * 
   * For mock mode:
   * - Just updates the expiration date
   * - Simulates 1 second API delay
   * 
   * @param {string} accountId - UUID of connected_accounts record
   * @returns {Promise<{success: boolean}>}
   */
  static async refreshMockToken(accountId) {
    try {
      console.log(`[MockOAuth] Refreshing token for account ${accountId}...`);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ----------------------------------------------------------------
      // Update Token Expiration
      // ----------------------------------------------------------------
      const { error } = await supabase
        .from('connected_accounts')
        .update({
          // New expiration: 30 days from now
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          
          // Track when we refreshed
          last_token_refresh: new Date(),
          
          // Reset status to active if it was expired
          connection_status: 'active'
        })
        .eq('id', accountId);

      if (error) {
        console.error(`[MockOAuth] Refresh error:`, error);
        throw error;
      }

      console.log(`[MockOAuth] Successfully refreshed token for ${accountId}`);

      return { success: true };

    } catch (error) {
      console.error(`[MockOAuth] Failed to refresh token:`, error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * CHECK IF PLATFORM ALREADY CONNECTED
   * ========================================================================
   * Prevents duplicate connections to same platform
   * 
   * @param {string} userId - Current user's ID
   * @param {string} platform - Platform to check
   * @returns {Promise<boolean>} True if already connected
   */
  static async isPlatformConnected(userId, platform) {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', platform)
        .in('connection_status', ['active', 'mock']) // Only active connections
        .limit(1);

      if (error) throw error;

      return (data && data.length > 0);

    } catch (error) {
      console.error(`[MockOAuth] Error checking platform:`, error);
      return false;
    }
  }
}