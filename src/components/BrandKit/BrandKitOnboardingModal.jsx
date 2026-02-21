// src/components/BrandKit/BrandKitOnboardingModal.jsx
import React, { useEffect } from 'react';
import { useNavigate }      from 'react-router-dom';
import useBrandKitStore     from '../../stores/BrandKitStore';

/**
 * Modal shown once per session when brand kit is not configured.
 * Trigger from GeneratePageV2 on mount.
 */
export default function BrandKitOnboardingModal({ userId, onClose }) {
  const navigate   = useNavigate();
  const skipSetup  = useBrandKitStore(s => s.skipSetup);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSetup = () => {
    onClose();
    navigate('/app/settings/brand-kit');
  };

  const handleSkip = async () => {
    if (userId) await skipSetup(userId);
    onClose();
  };

  return (
    <div className="bk-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bk-modal-title">
      <div className="bk-modal">
        <div className="bk-modal-icon">✨</div>
        <h2 id="bk-modal-title">Get better results with a Brand Kit</h2>
        <p>
          Your Brand Kit teaches the AI your voice, visual style, and content guardrails.
          Every generation — images, captions, hashtags — will match your brand.
        </p>
        <p className="bk-modal-time">Takes about 3 minutes. You can always edit it later.</p>
        <div className="bk-modal-actions">
          <button className="bk-modal-btn-primary" onClick={handleSetup}>
            Set up Brand Kit
          </button>
          <button className="bk-modal-btn-secondary" onClick={handleSkip}>
            Skip for now
          </button>
        </div>
        <p className="bk-modal-warning">⚠️ Skipping will result in generic outputs.</p>
      </div>
    </div>
  );
}
