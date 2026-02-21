// src/components/Generate/GenerationCanvas.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Sparkles, Send, Loader2, Square, Film, History } from 'lucide-react';
import toast from 'react-hot-toast';
import useSessionStore from '../../stores/SessionStore';
import useBrandKitStore from '../../stores/BrandKitStore';
import { BRAND_KIT_STATUS } from '../../constants/statusEnums';
import BatchGenerationGrid from './BatchGenerationGrid';
import IntentClarificationPanel from './IntentClarificationPanel';
import { checkIntentAmbiguity } from '../../services/intentExtractor';
import '../../styles/GenerateV2.css';

// Example prompts shown on the empty state
const EXAMPLE_PROMPTS = [
  { emoji: 'SUN', text: 'Golden hour portrait of a woman in a sunflower field, cinematic lighting' },
  { emoji: 'CITY', text: 'Neon-lit cyberpunk cityscape at rain-soaked night, 8K photorealistic' },
  { emoji: 'FOOD', text: 'Overhead shot of artisan pizza, steam rising, rustic wooden table, food photography' },
  { emoji: 'IDEA', text: 'Minimalist product shot of a perfume bottle on marble, clean white studio' },
];

export default function GenerationCanvas({ onOpenSessionRail, sessionRailOpen }) {
  const {
    activeSession,
    activeGenerations,
    isGenerating,
    generationProgress,
    settings,
    error,
    updateSettings,
    startGeneration,
    enhancePrompt: enhancePromptAction,
    selectGeneration,
    clearError,
    setClarifications,
    clearClarifications,
  } = useSessionStore();
  const brandKit = useBrandKitStore((s) => s.brandKit);
  const brandKitStatus = useBrandKitStore((s) => s.status);

  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [pendingInput, setPendingInput] = useState('');
  const textareaRef  = useRef(null);
  const scrollAnchorRef = useRef(null);

  // Show store errors as toasts, then clear them
  useEffect(() => {
    if (error) {
      toast.error(error, { id: 'store-error' });
      clearError();
    }
  }, [error, clearError]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [prompt]);

  // Auto-scroll to bottom when new generations appear
  useEffect(() => {
    if (activeGenerations.length > 0) {
      // Small delay so the DOM has painted
      setTimeout(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [activeGenerations.length, isGenerating]);

  const handleGenerateRequest = async (userInput) => {
    const brandKitObj = brandKit
      ? { configured: brandKitStatus === BRAND_KIT_STATUS.CONFIGURED, raw: brandKit }
      : { configured: false };

    const { ambiguous, questions } = checkIntentAmbiguity(userInput, brandKitObj);
    if (ambiguous) {
      setPendingInput(userInput);
      setClarificationQuestions(questions);
      setShowClarification(true);
      return;
    }

    clearClarifications();
    await startGeneration(userInput);
  };

  const handleClarificationSubmit = async (answers) => {
    setClarifications(answers);
    setShowClarification(false);
    await startGeneration(pendingInput);
    setPendingInput('');
  };

  const handleClarificationSkip = async () => {
    clearClarifications();
    setShowClarification(false);
    await startGeneration(pendingInput);
    setPendingInput('');
  };

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    try {
      setPrompt('');
      await handleGenerateRequest(trimmed);
    } catch (err) {
      // Error is handled by the store error -> toast flow above.
    }
  };

  const handleEnhance = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isEnhancing) return;

    setIsEnhancing(true);
    const toastId = toast.loading('Enhancing prompt...');
    try {
      const enhanced = await enhancePromptAction(trimmed);
      setPrompt(enhanced);
      toast.success('Prompt enhanced!', { id: toastId });
    } catch (err) {
      toast.error('Could not enhance prompt', { id: toastId });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (text) => {
    setPrompt(text);
    textareaRef.current?.focus();
  };

  // Group generations by batch_id for display
  const batches = activeGenerations.reduce((acc, gen) => {
    const key = gen.batch_id || gen.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(gen);
    return acc;
  }, {});

  const batchEntries = Object.entries(batches).map(([batchId, gens]) => ({
    batchId,
    gens: [...gens].sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0)),
  }));

  const hasHistory = batchEntries.length > 0;
  const pendingCount = settings.mediaType === 'video' ? 1 : settings.batchSize;

  return (
    <main className="generation-canvas">

      {/* Brand Kit Status Banner */}
      {brandKitStatus === BRAND_KIT_STATUS.MISSING && (
        <div className="brand-kit-status-banner missing" role="status">
          <span>Brand Kit not configured - outputs will be generic.</span>
          <a href="/app/settings/brand-kit">Set up Brand Kit</a>
        </div>
      )}
      {brandKitStatus === BRAND_KIT_STATUS.CONFIGURED && brandKit?.brand_name && (
        <div className="brand-kit-status-banner configured" role="status">
          <span>{brandKit.brand_name} Brand Kit active</span>
          <a href="/app/settings/brand-kit">Edit</a>
        </div>
      )}

      {/* Intent Clarification */}
      {showClarification && (
        <IntentClarificationPanel
          questions={clarificationQuestions}
          onSubmit={handleClarificationSubmit}
          onSkip={handleClarificationSkip}
        />
      )}

      {/* Messages / content area */}
      <div className="canvas-messages">

        {/* Empty state shown before any generation */}
        {!hasHistory && !isGenerating && (
          <div className="gen-empty-state">
            <div className="empty-icon-ring">
              <Sparkles size={28} aria-hidden="true" />
            </div>
            <h1 className="empty-headline">Create with AI</h1>
            <p className="empty-sub">
              Describe your vision below, or pick an example to get started.
              Use <strong>Magic Enhance</strong> to elevate your prompt.
            </p>

            <div className="example-prompts" role="list" aria-label="Example prompts">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  className="example-card"
                  role="listitem"
                  onClick={() => handleExampleClick(ex.text)}
                  aria-label={`Use example: ${ex.text}`}
                >
                  <span className="example-card-emoji" aria-hidden="true">{ex.emoji}</span>
                  <span className="example-card-text">{ex.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generation history */}
        {hasHistory && (
          <div className="generation-history" aria-live="polite" aria-label="Generation history">
            {batchEntries.map(({ batchId, gens }) => (
              <div key={batchId} className="generation-message">
                {/* User prompt bubble */}
                <div className="prompt-bubble">
                  <div className="prompt-bubble-body">
                    <p>{gens[0].prompt}</p>
                  </div>
                  <div className="prompt-bubble-avatar" aria-hidden="true">
                    You
                  </div>
                </div>

                {/* Batch result grid */}
                <BatchGenerationGrid
                  generations={gens}
                  onSelect={(gen) => selectGeneration(gen)}
                />
              </div>
            ))}
          </div>
        )}

        {/* In-progress batch shown while generating */}
        {isGenerating && (
          <div className="generation-message" aria-label="Generating...">
            <div className="prompt-bubble generating">
              <div className="prompt-bubble-body">
                <div className="bubble-generating-indicator">
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  Generating...
                </div>
                {prompt && <p>{prompt}</p>}
              </div>
              <div className="prompt-bubble-avatar" aria-hidden="true">You</div>
            </div>

            {/* Skeleton cards while generating */}
            <div
              className={`generation-results-grid count-${pendingCount}`}
              aria-label={`Generating ${pendingCount} image${pendingCount > 1 ? 's' : ''}`}
            >
              {Array.from({ length: pendingCount }).map((_, i) => (
                <div key={i} className="result-card processing" aria-hidden="true">
                  <div className="result-media-container">
                    <div className="processing-overlay">
                      <div className="processing-spinner" />
                      {pendingCount > 1 && (
                        <span className="processing-text">
                          {i + 1} of {pendingCount}
                        </span>
                      )}
                      <div className="processing-progress">
                        <div
                          className="processing-progress-fill"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                      <span className="progress-percentage">{generationProgress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scroll anchor always at bottom */}
        <div ref={scrollAnchorRef} className="scroll-anchor" aria-hidden="true" />
      </div>

      {/* Input dock */}
      <div className="canvas-input-dock">
        <div className="input-container" role="region" aria-label="Prompt input">

          {/* Settings bar */}
          <div className="settings-bar">

            {/* History toggle */}
            <button
              className="btn-enhance"
              style={{ flexShrink: 0 }}
              onClick={onOpenSessionRail}
              title={sessionRailOpen ? 'Hide session history' : 'Show session history'}
              aria-label="Toggle session history"
            >
              <History size={16} />
            </button>

            {/* Image / Video toggle */}
            <div className="setting-group">
              <label id="type-label">Type</label>
              <div className="toggle-buttons" role="group" aria-labelledby="type-label">
                <button
                  className={settings.mediaType === 'image' ? 'active' : ''}
                  onClick={() => updateSettings({ mediaType: 'image' })}
                  disabled={isGenerating}
                  aria-pressed={settings.mediaType === 'image'}
                >
                  <Square size={13} aria-hidden="true" />
                  <span>Image</span>
                </button>
                <button
                  className={settings.mediaType === 'video' ? 'active' : ''}
                  onClick={() => updateSettings({ mediaType: 'video' })}
                  disabled={isGenerating}
                  aria-pressed={settings.mediaType === 'video'}
                >
                  <Film size={13} aria-hidden="true" />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {/* Content Type Selector */}
            <div className="content-type-selector" role="group" aria-label="Content type">
              {['single', 'carousel', 'story'].map((type) => (
                <button
                  key={type}
                  className={`ctype-pill${settings.contentType === type ? ' active' : ''}`}
                  onClick={() => updateSettings({ contentType: type })}
                  aria-pressed={settings.contentType === type}
                  disabled={isGenerating}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Aspect ratio */}
            <div className="setting-group">
              <label htmlFor="aspect-select">Aspect</label>
              <select
                id="aspect-select"
                value={settings.aspectRatio}
                onChange={(e) => updateSettings({ aspectRatio: e.target.value })}
                disabled={isGenerating}
              >
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Wide</option>
                <option value="9:16">9:16 Portrait</option>
                <option value="4:5">4:5 Portrait</option>
              </select>
            </div>

            {/* Batch size images only */}
            {settings.mediaType === 'image' && (
              <div className="setting-group">
                <label id="count-label">Count</label>
                <div className="batch-pills" role="group" aria-labelledby="count-label">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      className={settings.batchSize === n ? 'active' : ''}
                      onClick={() => updateSettings({ batchSize: n })}
                      disabled={isGenerating}
                      aria-pressed={settings.batchSize === n}
                      aria-label={`${n} image${n > 1 ? 's' : ''}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prompt input */}
          <div className="prompt-input-area">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeSession
                    ? 'Describe your next image...'
                    : 'Describe your vision...'
                }
                rows={1}
                disabled={isGenerating}
                aria-label="Prompt"
                aria-multiline="true"
              />

              <div className="input-actions">
                {/* Magic Enhance */}
                <button
                  type="button"
                  className={`btn-enhance${isEnhancing ? ' enhancing' : ''}`}
                  onClick={handleEnhance}
                  disabled={!prompt.trim() || isEnhancing || isGenerating}
                  title="Magic Enhance - improve your prompt with AI"
                  aria-label="Enhance prompt"
                >
                  {isEnhancing
                    ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    : <Wand2 size={16} aria-hidden="true" />}
                </button>

                {/* Generate */}
                <button
                  type="button"
                  className="btn-send"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isGenerating}
                  aria-label={isGenerating ? 'Generating...' : 'Generate'}
                >
                  {isGenerating ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <Send size={16} aria-hidden="true" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

