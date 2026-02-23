// src/pages/GeneratePage/GeneratePageV2.jsx
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import useSessionStore from '../../stores/SessionStore';
import UserNavbar from '../../components/User/UserNavbar';
import UserSidebar from '../../components/User/UserSidebar';
import SessionHistoryRail from '../../components/Generate/SessionHistoryRail';
import GenerationCanvas from '../../components/Generate/GenerationCanvas';
import PostProductionPanel from '../../components/Generate/PostProductionPanel';
import VideoProcessingModal, { VideoStatusBar } from '../../components/Generate/VideoProcessingModal';
import BrandKitOnboardingModal from '../../components/BrandKit/BrandKitOnboardingModal';
import useBrandKitStore from '../../stores/BrandKitStore';
import { useAuth } from '../../Context/AuthContext';
import '../../styles/GenerateV2.css';
import '../../styles/UserDashboard.css'; // Ensures dashboard shell tokens/classes are available

/**
 * GeneratePageV2
 * Fits into the same dashboard-shell grid used by UserDashboard.
 * Layout: [Navbar spans full width] / [UserSidebar | generate-workspace]
 * The generate-workspace contains the session rail (overlay) + canvas + post panel.
 */
export default function GeneratePageV2() {
  const { user } = useAuth();
  const {
    activeGenerations,
    selectedGeneration,
    selectGeneration,
    subscribeToGenerations,
    resetPostProduction,
    videoJobState,
    setVideoJobMinimized,
    dismissVideoJob,
    startVideoGeneration,
  } = useSessionStore();
  const brandKit = useBrandKitStore((s) => s.brandKit);
  const loadBrandKit = useBrandKitStore((s) => s.loadBrandKit);

  const [sessionRailOpen, setSessionRailOpen] = useState(false);
  const [postPanelOpen,   setPostPanelOpen]   = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load brand kit on mount.
  useEffect(() => {
    if (user?.id) {
      loadBrandKit(user.id);
    }
  }, [user?.id, loadBrandKit]);

  // Show onboarding modal once per session.
  useEffect(() => {
    if (!brandKit) return;
    const alreadyShown = sessionStorage.getItem('brandKitPromptShown');
    if (!brandKit.setup_completed && !brandKit.setup_skipped && !alreadyShown) {
      sessionStorage.setItem('brandKitPromptShown', '1');
      setShowOnboarding(true);
    }
  }, [brandKit]);

  // Subscribe to realtime generation updates.
  useEffect(() => {
    const unsubscribe = subscribeToGenerations();
    return unsubscribe;
  }, [subscribeToGenerations]);

  // Open post-production panel when a generation is selected.
  useEffect(() => {
    if (selectedGeneration) {
      setPostPanelOpen(true);
      // Always reset to Step 1 for a new selection.
      resetPostProduction();
    }
  }, [selectedGeneration?.id, resetPostProduction]); // Re-run when ID changes.

  const handleClosePostPanel = () => {
    setPostPanelOpen(false);
    selectGeneration(null);
  };

  const handleViewCompletedVideo = () => {
    const completedVideo = activeGenerations.find((item) => (
      item.id === videoJobState.generationId
      && item.media_type === 'video'
      && item.status === 'completed'
    ));
    if (completedVideo) {
      selectGeneration(completedVideo);
    }
    dismissVideoJob();
  };

  return (
    <div className="dashboard-shell">
      {/* Toast notifications replace all window.alert() calls. */}
      <Toaster
        position="top-center"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background:  'var(--gen-panel)',
            color:       'var(--gen-text-1)',
            border:      '1px solid var(--gen-border)',
            borderRadius: '10px',
            fontSize:    '0.875rem',
            fontWeight:  '500',
            boxShadow:   'var(--gen-shadow-md)',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      {/* Top navbar (row 1, spans full width). */}
      <UserNavbar />

      {/* App sidebar (col 1, row 2). */}
      <UserSidebar />

      {/* Generate workspace (col 2, row 2). */}
      <div className="generate-workspace">

        {/* Session rail overlay that slides in from the left. */}
        <SessionHistoryRail
          isOpen={sessionRailOpen}
          onClose={() => setSessionRailOpen(false)}
          onOpen={() => setSessionRailOpen(true)}
        />

        {/* Main canvas that always fills available width. */}
        <GenerationCanvas
          onOpenSessionRail={() => setSessionRailOpen(v => !v)}
          sessionRailOpen={sessionRailOpen}
        />

        {/* Post-production drawer that slides in from the right. */}
        {postPanelOpen && selectedGeneration && (
          <PostProductionPanel onClose={handleClosePostPanel} />
        )}
      </div>

      {showOnboarding && (
        <BrandKitOnboardingModal
          userId={user?.id}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {videoJobState.status && (
        videoJobState.isMinimized ? (
          <VideoStatusBar
            status={videoJobState.status}
            progress={videoJobState.progress}
            onExpand={() => setVideoJobMinimized(false)}
            onDismiss={dismissVideoJob}
          />
        ) : (
          <VideoProcessingModal
            jobId={videoJobState.jobId}
            prompt={videoJobState.prompt}
            status={videoJobState.status}
            progress={videoJobState.progress}
            videoUrl={videoJobState.videoUrl}
            onMinimize={() => setVideoJobMinimized(true)}
            onDismiss={dismissVideoJob}
            onRetry={async () => {
              try {
                await startVideoGeneration(videoJobState.prompt);
              } catch (_err) {
                // Error state is already handled in the store.
              }
            }}
            onViewInCanvas={handleViewCompletedVideo}
          />
        )
      )}
    </div>
  );
}

