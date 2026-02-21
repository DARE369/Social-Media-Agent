// src/pages/Settings/BrandKitPage.jsx
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import useBrandKitStore from '../../stores/BrandKitStore';
import BrandKitForm from '../../components/BrandKit/BrandKitForm';
import UserNavbar from '../../components/User/UserNavbar';
import UserSidebar from '../../components/User/UserSidebar';
import '../../styles/BrandKit.css';
import '../../styles/UserDashboard.css';

/**
 * Full-width Brand Kit settings page.
 * Route: /app/settings/brand-kit.
 */
export default function BrandKitPage() {
  const { user } = useAuth();

  const {
    brandKit,
    isLoading,
    isSaving,
    error,
    loadBrandKit,
    saveBrandKit,
    markSetupComplete,
  } = useBrandKitStore();

  useEffect(() => {
    if (user?.id) {
      loadBrandKit(user.id);
    }
  }, [user?.id, loadBrandKit]);

  const handleSave = async (fields) => {
    await saveBrandKit(user.id, fields);
    if (fields.brand_name) {
      await markSetupComplete(user.id);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dashboard-shell">
      <UserNavbar />
      <UserSidebar />

      <main className="dashboard-content">
        <div className="bk-page">
          <div className="bk-page-header">
            <h1>Brand Kit</h1>
            <p className="bk-page-subtitle">
              Teach the AI your brand&apos;s voice, visual style, and guardrails. Used in every generation.
            </p>
          </div>

          {isLoading && <div className="bk-page-loading">Loading Brand Kit...</div>}
          {error && <div className="bk-error-banner" role="alert">{error}</div>}

          {!isLoading && (
            <BrandKitForm
              initialData={brandKit ?? {}}
              onSave={handleSave}
              userId={user?.id}
              brandKitId={brandKit?.id ?? null}
              isSaving={isSaving}
            />
          )}
        </div>
      </main>
    </div>
  );
}
