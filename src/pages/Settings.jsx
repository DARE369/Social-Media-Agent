// ============================================================================
// FILE: src/pages/Settings.jsx
// ============================================================================
// Purpose: User interface for managing social media account connections
// 
// Features:
// - Display all available platforms (Instagram, TikTok, YouTube)
// - Show DB-backed connection status and account stats
// - Disconnect connected accounts
// - Professional UI with loading states and error handling
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../Context/AuthContext';
import '../styles/Settings.css'; // We'll create this next

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================
// Defines all supported platforms with branding and capabilities

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F', // Instagram brand color
    icon: '📸', // Using emoji for now (no Chakra icons)
    description: 'Share photos and Reels to your Instagram business account',
    capabilities: ['Images', 'Videos (Reels)', 'Carousels', 'Stories']
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#000000', // TikTok brand color
    icon: '🎵',
    description: 'Post short-form vertical videos to TikTok',
    capabilities: ['Videos (9:16)', 'Max 10 min', 'Auto-captions', 'Duets']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000', // YouTube brand color
    icon: '📺',
    description: 'Upload videos and Shorts to your YouTube channel',
    capabilities: ['Long videos', 'Shorts', 'Scheduled publishing', 'Playlists']
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Settings() {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  // Auth context - provides current user info
  const { user } = useAuth();

  // List of connected accounts from database
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Loading state for initial fetch
  const [loading, setLoading] = useState(true);

  // Track which platform is currently being connected
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  // Account being disconnected (for confirmation dialog)
  const [accountToDisconnect, setAccountToDisconnect] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // --------------------------------------------------------------------------
  // LIFECYCLE: Fetch Connected Accounts on Mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Only fetch if user is logged in
    if (user) {
      fetchConnectedAccounts();
    }
  }, [user]);

  // --------------------------------------------------------------------------
  // FETCH CONNECTED ACCOUNTS
  // --------------------------------------------------------------------------
  // Loads all connected accounts from database

  const fetchConnectedAccounts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('connection_status', ['active', 'expired', 'mock'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[Settings] Fetched accounts:', data);
      setConnectedAccounts(data || []);

    } catch (error) {
      console.error('[Settings] Failed to fetch accounts:', error);
      showToast('Error loading accounts: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLE CONNECT PLATFORM
  // --------------------------------------------------------------------------
  // Starts account connection flow (not configured in this build)

  const handleConnect = async (platform) => {
    const alreadyConnected = connectedAccounts.some(
      (acc) => acc.platform === platform && acc.connection_status !== 'revoked'
    );

    if (alreadyConnected) {
      showToast(`${platform} is already connected`, 'warning');
      return;
    }

    showToast(
      `${platform} OAuth connect flow is not configured in this build.`,
      'info'
    );
  };

  // --------------------------------------------------------------------------
  // HANDLE DISCONNECT (SHOW CONFIRMATION)
  // --------------------------------------------------------------------------
  // Sets account for confirmation dialog

  const handleDisconnectClick = (account) => {
    setAccountToDisconnect(account);
  };

  // --------------------------------------------------------------------------
  // HANDLE DISCONNECT CONFIRM
  // --------------------------------------------------------------------------
  // Actually disconnects the account after confirmation

  const handleDisconnectConfirm = async () => {
    if (!accountToDisconnect) return;

    try {
      // Mark the account as revoked in DB
      const { error } = await supabase
        .from('connected_accounts')
        .update({
          connection_status: 'revoked',
          access_token: null,
          access_meta: null,
        })
        .eq('id', accountToDisconnect.id);

      if (error) throw error;

      showToast(
        `${accountToDisconnect.platform} account disconnected`,
        'info'
      );

      // Refresh accounts list
      await fetchConnectedAccounts();

    } catch (error) {
      console.error('[Settings] Disconnect failed:', error);
      showToast('Disconnect failed: ' + error.message, 'error');
    } finally {
      // Close confirmation dialog
      setAccountToDisconnect(null);
    }
  };

  // --------------------------------------------------------------------------
  // HELPER: Get Connection for Platform
  // --------------------------------------------------------------------------
  // Finds connected account for a specific platform (if exists)

  const getConnectionForPlatform = (platformId) => {
    return connectedAccounts.find(
      acc => acc.platform === platformId && acc.connection_status !== 'revoked'
    );
  };

  // --------------------------------------------------------------------------
  // HELPER: Show Toast Notification
  // --------------------------------------------------------------------------
  // Displays temporary notification message

  const showToast = (message, type = 'info') => {
    setToast({ message, type });

    // Auto-hide after 5 seconds
    setTimeout(() => setToast(null), 5000);
  };

  // --------------------------------------------------------------------------
  // RENDER: Loading State
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading connected accounts...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Main UI
  // --------------------------------------------------------------------------
  return (
    <div className="settings-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <h1>Connected Accounts</h1>
        <p className="subtitle">
          Manage your social media connections for automated posting
        </p>
      </div>

      {/* Platform Cards */}
      <div className="platforms-grid">
        {PLATFORMS.map(platform => {
          const connection = getConnectionForPlatform(platform.id);
          const isConnected = !!connection;
          const isConnecting = connectingPlatform === platform.id;

          return (
            <div key={platform.id} className="platform-card">
              {!isConnected ? (
                // ============================================================
                // NOT CONNECTED STATE
                // ============================================================
                <>
                  <div className="platform-card-header">
                    <div
                      className="platform-icon"
                      style={{ backgroundColor: `${platform.color}20` }}
                    >
                      <span style={{ fontSize: '32px' }}>{platform.icon}</span>
                    </div>

                    <div className="platform-info">
                      <h3>{platform.name}</h3>
                      <p className="platform-description">{platform.description}</p>

                      <div className="platform-capabilities">
                        {platform.capabilities.map(cap => (
                          <span key={cap} className="capability-badge">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleConnect(platform.id)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <span className="spinner-small"></span>
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                </>
              ) : (
                // ============================================================
                // CONNECTED STATE
                // ============================================================
                <>
                  <div className="platform-card-header">
                    <div
                      className="platform-icon"
                      style={{ backgroundColor: `${platform.color}20` }}
                    >
                      <span style={{ fontSize: '32px' }}>{platform.icon}</span>
                    </div>

                    <div className="platform-info">
                      <div className="platform-name-badges">
                        <h3>{platform.name}</h3>
                        <span className="badge badge-success">✓ Connected</span>
                        {connection.connection_status === 'mock' && (
                          <span className="badge badge-purple">Mock</span>
                        )}
                      </div>

                      <div className="connected-account-info">
                        <img
                          src={connection.profile_picture_url || connection.avatar_url}
                          alt={connection.username}
                          className="account-avatar"
                        />
                        <span className="account-username">@{connection.username}</span>
                      </div>
                    </div>

                    <button
                      className="btn-ghost btn-danger"
                      onClick={() => handleDisconnectClick(connection)}
                    >
                      🗑️ Disconnect
                    </button>
                  </div>

                  <div className="platform-divider"></div>

                  {/* Platform Stats */}
                  <div className="platform-stats">
                    {platform.id === 'instagram' && (
                      <>
                        <div className="stat">
                          <span className="stat-label">Followers</span>
                          <span className="stat-value">
                            {connection.platform_metadata?.followers_count?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Posts</span>
                          <span className="stat-value">
                            {connection.platform_metadata?.media_count || 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                    {platform.id === 'tiktok' && (
                      <>
                        <div className="stat">
                          <span className="stat-label">Followers</span>
                          <span className="stat-value">
                            {connection.platform_metadata?.follower_count?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Videos</span>
                          <span className="stat-value">
                            {connection.platform_metadata?.video_count || 'N/A'}
                          </span>
                        </div>
                      </>
                    )}

                    {platform.id === 'youtube' && (
                      <>
                        <div className="stat">
                          <span className="stat-label">Subscribers</span>
                          <span className="stat-value">
                            {connection.platform_metadata?.subscriber_count?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Videos</span>
                          <span className="stat-value">
                            {connection.platform_metadata?.video_count || 'N/A'}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="stat">
                      <span className="stat-label">Connected</span>
                      <span className="stat-value">
                        {new Date(connection.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Disconnect Confirmation Dialog */}
      {accountToDisconnect && (
        <div className="modal-overlay" onClick={() => setAccountToDisconnect(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Disconnect {accountToDisconnect.platform}?</h3>
            <p>
              Are you sure you want to disconnect <strong>@{accountToDisconnect.username}</strong>?
              You'll need to reconnect to publish content to this account.
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setAccountToDisconnect(null)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleDisconnectConfirm}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div> // This is the final closing div for settings-container
  ); // This closes the return statement
} // This closes the Settings function
