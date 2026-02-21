// src/components/Generate/PostProductionPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Wand2, Hash, Calendar, Instagram, Linkedin, Youtube,
  CheckCircle2, Send, TrendingUp, AlertTriangle, Wifi, RefreshCw,
  Twitter, Facebook,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import useSessionStore from '../../stores/SessionStore';
import { POST_STATUS } from '../../stores/SessionStore';
import SEOPanel from './SEOPanel';
import '../../styles/GenerateV2.css';

const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function resolveVideoSource(url) {
  if (!url) return FALLBACK_VIDEO_URL;
  return url.includes('video.pollinations.ai') ? FALLBACK_VIDEO_URL : url;
}

// Platform icon map.
const PLATFORM_ICONS = {
  instagram: Instagram,
  linkedin:  Linkedin,
  youtube:   Youtube,
  twitter:   Twitter,
  facebook:  Facebook,
};

function PlatformIcon({ platform, size = 18 }) {
  const Icon = PLATFORM_ICONS[platform?.toLowerCase()] ?? Wifi;
  return <Icon size={size} />;
}

// Steps config.
const STEPS = [
  { id: 1, label: 'Content' },
  { id: 2, label: 'SEO' },
  { id: 3, label: 'Publish' },
];

// Character limits per platform.
const CHAR_LIMITS = {
  instagram: 2200,
  twitter:   280,
  linkedin:  3000,
  facebook:  63206,
  youtube:   5000,
  default:   2200,
};

function getCharLimit(selectedAccountIds, accounts) {
  if (selectedAccountIds.length === 0) return CHAR_LIMITS.default;
  const platforms = selectedAccountIds
    .map(id => accounts.find(a => a.id === id)?.platform?.toLowerCase())
    .filter(Boolean);
  // Return the most restrictive limit
  return Math.min(...platforms.map(p => CHAR_LIMITS[p] ?? CHAR_LIMITS.default));
}

// ============================================================================
export default function PostProductionPanel({ onClose }) {
  const {
    selectedGeneration,
    postProduction,
    updatePostProduction,
    generateCaption,
    optimizeCaption,
    publishContent,
  } = useSessionStore();
  const selectedId = useSessionStore((s) => s.selectedGeneration?.id);

  const [step,              setStep]            = useState(1);
  const [loading,           setLoading]         = useState(false);
  const [accounts,          setAccounts]        = useState([]);
  const [accountsLoading,   setAccountsLoading] = useState(true);
  const [success,           setSuccess]         = useState(null); // { message, status }
  const [newTag,            setNewTag]          = useState('');
  const [contentPlan,       setContentPlan]     = useState(null);

  useEffect(() => {
    setStep(1);
  }, [selectedId]);

  useEffect(() => {
    let mounted = true;
    const contentPlanId = selectedGeneration?.content_plan_id;
    if (!contentPlanId) {
      setContentPlan(null);
      return () => { mounted = false; };
    }

    supabase
      .from('content_plans')
      .select('content_plan')
      .eq('id', contentPlanId)
      .single()
      .then(({ data }) => {
        if (mounted) {
          setContentPlan(data?.content_plan ?? null);
        }
      });

    return () => { mounted = false; };
  }, [selectedGeneration?.content_plan_id]);

  useEffect(() => {
    if (!contentPlan) return;

    const nextCaption = contentPlan.caption?.primary
      || contentPlan.seo?.optimized_caption
      || '';
    const nextHashtags = contentPlan.seo?.optimized_hashtags
      || contentPlan.hashtags?.platform_sets?.instagram
      || contentPlan.hashtags?.primary
      || [];

    if (nextCaption && !postProduction.caption) {
      updatePostProduction({ caption: nextCaption });
    }
    if (Array.isArray(nextHashtags) && nextHashtags.length > 0 && postProduction.hashtags.length === 0) {
      updatePostProduction({ hashtags: nextHashtags });
    }
  }, [contentPlan, postProduction.caption, postProduction.hashtags.length, updatePostProduction]);

  // Fetch connected accounts (filtered to active + expired).
  useEffect(() => {
    let mounted = true;
    async function fetchAccounts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('user_id', user.id)
          // P1 FIX: only fetch non-error accounts; expired shown with reconnect CTA
          .in('connection_status', ['active', 'expired'])
          .order('platform');

        if (error) throw error;
        if (mounted) setAccounts(data || []);
      } catch (err) {
        console.error('fetchAccounts:', err);
        toast.error('Could not load connected accounts');
      } finally {
        if (mounted) setAccountsLoading(false);
      }
    }
    fetchAccounts();
    return () => { mounted = false; };
  }, []);

  const charLimit = getCharLimit(postProduction.selectedPlatforms, accounts);
  const charCount = postProduction.caption.length;
  const isOverLimit = charCount > charLimit;
  // Handlers.

  const handleGenerateCaption = async () => {
    if (!selectedGeneration) return;
    setLoading(true);
    const toastId = toast.loading('Generating caption...');
    try {
      // Use the first selected platform, fall back to instagram
      const firstPlatform = postProduction.selectedPlatforms[0]
        ? accounts.find(a => a.id === postProduction.selectedPlatforms[0])?.platform
        : 'instagram';
      await generateCaption(firstPlatform || 'instagram');
      toast.success('Caption ready!', { id: toastId });
    } catch (err) {
      toast.error('Caption generation failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    const toastId = toast.loading('Optimizing for SEO...');
    try {
      const result = await optimizeCaption();
      toast.success(`SEO score: ${result?.seoScore ?? '?'}/100`, { id: toastId });
    } catch (err) {
      toast.error('Optimization failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (accountId, isExpired) => {
    if (isExpired) {
      toast.error('Reconnect this account before publishing to it');
      return;
    }
    const current = postProduction.selectedPlatforms;
    updatePostProduction({
      selectedPlatforms: current.includes(accountId)
        ? current.filter(id => id !== accountId)
        : [...current, accountId],
    });
  };

  const addHashtag = () => {
    const tag = newTag.trim().replace(/^#/, '');
    if (!tag) return;
    const normalized = `#${tag}`;
    if (postProduction.hashtags.includes(normalized)) return;
    updatePostProduction({ hashtags: [...postProduction.hashtags, normalized] });
    setNewTag('');
  };

  const removeHashtag = (idx) => {
    updatePostProduction({
      hashtags: postProduction.hashtags.filter((_, i) => i !== idx),
    });
  };

  const handlePublish = async () => {
    if (postProduction.selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    if (isOverLimit) {
      toast.error(`Caption exceeds the ${charLimit} character limit`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      postProduction.scheduleDate ? 'Scheduling post...' : 'Publishing...'
    );

    try {
      const result = await publishContent();
      toast.success(result.message, { id: toastId });
      // P1 FIX: show in-panel success screen instead of alert
      setSuccess({ message: result.message, status: result.status });
    } catch (err) {
      toast.error(err.message || 'Publish failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = step === 1
    ? postProduction.caption.trim().length > 0 && !isOverLimit
    : step === 2;

  if (!selectedGeneration) return null;

  return (
    <>
      {/* Dim backdrop */}
      <div className="panel-overlay" onClick={onClose} aria-hidden="true" />

      <aside
        className="post-production-panel"
        role="complementary"
        aria-label="Post production"
      >
        {/* Header */}
        <div className="panel-header">
          <h2 className="panel-title">Post Production</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>

        {/* Success screen (replaces content after publish). */}
        {success ? (
          <div className="panel-success">
            <div className="panel-success-icon">
              <CheckCircle2 size={28} aria-hidden="true" />
            </div>
            <h3>{success.message}</h3>
            <p>
              {success.status === POST_STATUS.PUBLISHED
                ? 'Your post is live on the selected platforms.'
                : 'Your post has been queued and will go out at the scheduled time.'}
            </p>
            <button
              className="btn-panel-next"
              style={{ marginTop: 8, width: '100%' }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Step indicators */}
            <div className="panel-steps" role="tablist" aria-label="Steps">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <button
                    className={[
                      'panel-step',
                      step === s.id   ? 'active' : '',
                      step > s.id     ? 'done'   : '',
                    ].filter(Boolean).join(' ')}
                    role="tab"
                    aria-selected={step === s.id}
                    onClick={() => step > s.id && setStep(s.id)}
                    style={{ cursor: step > s.id ? 'pointer' : 'default' }}
                    type="button"
                  >
                    <span className="step-num">
                      {step > s.id ? <CheckCircle2 size={12} /> : s.id}
                    </span>
                    <span className="step-label">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`step-connector ${step > s.id ? 'done' : ''}`} aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="panel-content">

              {/* Media preview */}
              <div className="media-preview-card">
                {selectedGeneration.media_type === 'video' ? (
                  <video
                    src={resolveVideoSource(selectedGeneration.storage_path)}
                    controls
                    className="preview-media"
                    aria-label="Selected video preview"
                  />
                ) : (
                  <img
                    src={selectedGeneration.storage_path}
                    alt="Selected generation preview"
                    className="preview-media"
                  />
                )}
              </div>

              {/* STEP 1: Content (Caption + Hashtags) */}
              {step === 1 && (
                <div className="step-content">

                  {/* Caption */}
                  <div>
                    <div className="field-label-row">
                      <span className="field-label">Caption</span>
                      <button
                        className="btn-sm"
                        onClick={handleGenerateCaption}
                        disabled={loading}
                        aria-label="Generate caption with AI"
                      >
                        <Wand2 size={12} />
                        {loading ? 'Generating...' : 'Generate'}
                      </button>
                    </div>

                    <textarea
                      className="caption-input"
                      value={postProduction.caption}
                      onChange={(e) => updatePostProduction({ caption: e.target.value })}
                      placeholder="Write your caption, or click Generate to create one with AI..."
                      rows={5}
                      aria-label="Post caption"
                    />

                    <p className={`char-count ${isOverLimit ? 'over' : ''}`}>
                      {charCount}
                      {charLimit < 9999 ? ` / ${charLimit}` : ''} characters
                      {isOverLimit && ' - over limit!'}
                    </p>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <div className="field-label-row">
                      <span className="field-label">Hashtags</span>
                      <button
                        className="btn-sm"
                        onClick={handleGenerateCaption}
                        disabled={loading}
                        aria-label="Suggest hashtags with AI"
                      >
                        <Hash size={12} />
                        Suggest
                      </button>
                    </div>

                    <div className="hashtag-cloud" aria-label="Hashtag list">
                      {postProduction.hashtags.length === 0 ? (
                        <span className="hashtag-empty">No hashtags yet - generate or type below</span>
                      ) : (
                        postProduction.hashtags.map((tag, i) => (
                          <span key={i} className="hashtag-pill">
                            {tag}
                            <button
                              className="remove-tag"
                              onClick={() => removeHashtag(i)}
                              aria-label={`Remove ${tag}`}
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Manual hashtag input */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input
                        type="text"
                        className="caption-input"
                        style={{ flex: 1, padding: '7px 11px', resize: 'none' }}
                        placeholder="#addhashtag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            addHashtag();
                          }
                        }}
                        aria-label="Add hashtag"
                      />
                      <button
                        className="btn-sm"
                        onClick={addHashtag}
                        disabled={!newTag.trim()}
                        style={{ flexShrink: 0 }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* SEO Optimization */}
                  {postProduction.caption.trim() && (
                    <div style={{
                      padding:       '10px 12px',
                      background:    'var(--gen-panel-2)',
                      border:        '1px solid var(--gen-border)',
                      borderRadius:  '9px',
                    }}>
                      <div className="field-label-row" style={{ marginBottom: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--gen-text-2)' }}>
                          <TrendingUp size={14} />
                          SEO Optimization
                        </span>
                        {postProduction.seoScore > 0 && (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '999px',
                            background: 'var(--gen-success-sub)', color: 'var(--gen-success)',
                          }}>
                            {postProduction.seoScore}/100
                          </span>
                        )}
                      </div>
                      <button
                        className="btn-sm"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleOptimize}
                        disabled={loading}
                      >
                        {loading ? 'Optimizing...' : 'Optimize caption & hashtags'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SEO */}
              {step === 2 && (
                <div className="step-content">
                  {contentPlan?.seo ? (
                    <SEOPanel
                      seo={contentPlan.seo}
                      onChange={(field, value) => {
                        setContentPlan((cp) => ({
                          ...cp,
                          seo: { ...cp.seo, [field]: value },
                        }));

                        if (field === 'optimized_caption') {
                          updatePostProduction({ caption: value });
                        }
                        if (field === 'optimized_hashtags') {
                          updatePostProduction({ hashtags: value });
                        }
                      }}
                    />
                  ) : (
                    <div className="ppp-hashtags-legacy">
                      <p className="hashtag-empty">
                        No SEO plan found for this generation. Use caption optimization in Step 1.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Publish (Platforms + Schedule) */}
              {step === 3 && (
                <div className="step-content">

                  {/* Platform selection */}
                  <div>
                    <div className="field-label-row" style={{ marginBottom: 10 }}>
                      <span className="field-label">Select Platforms</span>
                    </div>

                    {accountsLoading ? (
                      <div style={{ padding: '20px 0', color: 'var(--gen-text-3)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Loading accounts...
                      </div>
                    ) : accounts.length === 0 ? (
                      <div className="no-accounts-state">
                        <Wifi size={24} aria-hidden="true" />
                        <p>No connected accounts</p>
                        <button
                          className="btn-sm"
                          onClick={() => window.location.href = '/app/settings'}
                        >
                          Connect an account
                        </button>
                      </div>
                    ) : (
                      <div className="platform-list" role="list" aria-label="Platform accounts">
                        {accounts.map((acc) => {
                          const isExpired  = acc.connection_status === 'expired';
                          const isSelected = postProduction.selectedPlatforms.includes(acc.id);
                          return (
                            <button
                              key={acc.id}
                              className={[
                                'platform-card',
                                isSelected ? 'selected'  : '',
                                isExpired  ? 'disabled'  : '',
                              ].filter(Boolean).join(' ')}
                              role="listitem"
                              onClick={() => togglePlatform(acc.id, isExpired)}
                              aria-pressed={isSelected}
                              aria-label={`${acc.platform} - ${acc.account_name}${isExpired ? ' (expired)' : ''}`}
                            >
                              <div className="platform-icon-wrap">
                                <PlatformIcon platform={acc.platform} size={18} />
                              </div>

                              <div className="platform-info">
                                <span className="platform-name">{acc.account_name}</span>
                                <span className={`platform-status-tag ${isExpired ? 'expired' : 'active'}`}>
                                  {isExpired ? (
                                    <><AlertTriangle size={10} /> Expired</>
                                  ) : (
                                    <><Wifi size={10} /> Active</>
                                  )}
                                </span>
                              </div>

                              {isExpired ? (
                                <span
                                  className="platform-reconnect-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = '/app/settings';
                                  }}
                                  aria-label={`Reconnect ${acc.platform}`}
                                >
                                  <RefreshCw size={11} style={{ display: 'inline', marginRight: 3 }} />
                                  Reconnect
                                </span>
                              ) : isSelected ? (
                                <CheckCircle2 size={17} className="platform-check" aria-hidden="true" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Schedule */}
                  <div>
                    <div className="field-label-row" style={{ marginBottom: 10 }}>
                      <span className="field-label">When to Publish</span>
                    </div>

                    <div className="schedule-toggle">
                      <button
                        className={`schedule-btn ${!postProduction.scheduleDate ? 'active' : ''}`}
                        onClick={() => updatePostProduction({ scheduleDate: null })}
                        aria-pressed={!postProduction.scheduleDate}
                      >
                        <Send size={14} aria-hidden="true" />
                        Post Now
                      </button>
                      <button
                        className={`schedule-btn ${postProduction.scheduleDate ? 'active' : ''}`}
                        onClick={() => {
                          // Set a default schedule time of tomorrow at current time
                          const tomorrow = new Date(Date.now() + 86400000);
                          updatePostProduction({ scheduleDate: tomorrow.toISOString() });
                        }}
                        aria-pressed={!!postProduction.scheduleDate}
                      >
                        <Calendar size={14} aria-hidden="true" />
                        Schedule
                      </button>
                    </div>

                    {postProduction.scheduleDate && (
                      <input
                        type="datetime-local"
                        className="schedule-datetime"
                        style={{ marginTop: 8 }}
                        value={
                          // Format ISO string to datetime-local format
                          new Date(postProduction.scheduleDate)
                            .toISOString()
                            .slice(0, 16)
                        }
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => updatePostProduction({
                          scheduleDate: new Date(e.target.value).toISOString(),
                        })}
                        aria-label="Schedule date and time"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer nav buttons */}
            <div className="panel-footer">
              {step > 1 && (
                <button
                  className="btn-panel-back"
                  onClick={() => setStep(s => s - 1)}
                  aria-label="Go back to previous step"
                >
                  Back
                </button>
              )}

              {step < STEPS.length ? (
                <button
                  className="btn-panel-next"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canGoNext}
                  aria-label="Continue to next step"
                >
                  {step === 1 ? 'Next: SEO' : 'Next: Publish'}
                </button>
              ) : (
                <button
                  className="btn-panel-publish"
                  onClick={handlePublish}
                  disabled={
                    loading ||
                    postProduction.selectedPlatforms.length === 0 ||
                    isOverLimit
                  }
                  aria-label={
                    postProduction.scheduleDate ? 'Schedule post' : 'Publish now'
                  }
                >
                  {loading ? (
                    'Publishing...'
                  ) : postProduction.scheduleDate ? (
                    <><Calendar size={15} /> Schedule Post</>
                  ) : (
                    <><Send size={15} /> Publish Now</>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
