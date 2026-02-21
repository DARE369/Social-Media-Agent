import React, { useState } from 'react';
import { Check, Download, Maximize2, CheckSquare } from 'lucide-react';
import { GENERATION_STATUS } from '../../constants/statusEnums';
import '../../styles/GenerateV2.css';

const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function resolveVideoSource(url) {
  if (!url) return FALLBACK_VIDEO_URL;
  return url.includes('video.pollinations.ai') ? FALLBACK_VIDEO_URL : url;
}

/**
 * BatchGenerationGrid - Displays generated images/videos in a grid
 * Shows full-size previews with proper aspect ratios
 */
export default function BatchGenerationGrid({ generations = [], onSelect }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);

  const completedGenerations = generations.filter(
    (generation) => generation.status === GENERATION_STATUS.COMPLETED
  );
  const allCompleted = completedGenerations.length === generations.length && generations.length > 0;

  const handleSelect = (generation) => {
    if (onSelect) {
      onSelect(generation);
    }
  };

  const toggleSelection = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = completedGenerations.map(g => g.id);
    setSelectedIds(allIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const useSelected = () => {
    const selectedGenerations = generations.filter(g => selectedIds.includes(g.id));
    if (selectedGenerations.length > 0 && onSelect) {
      // For now, select the first one. Later can handle multiple selections
      onSelect(selectedGenerations[0]);
    }
  };

  const handleDownload = async (generation, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(generation.storage_path);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generation_${generation.id}.${generation.media_type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const downloadSelected = async () => {
    const selected = generations.filter(g => selectedIds.includes(g.id));
    for (const gen of selected) {
      await handleDownload(gen, { stopPropagation: () => {} });
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleCardKeyDown = (event, generation, isCompleted) => {
    if (!isCompleted) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(generation);
    }
  };

  return (
    <div className="batch-generation-container">
      {/* Selection Header (only show if multiple completed items) */}
      {allCompleted && completedGenerations.length > 1 && (
        <div className="batch-selection-header">
          <div className="selection-info">
            <span className="batch-count">
              {completedGenerations.length} {completedGenerations.length === 1 ? 'image' : 'images'}
            </span>
            {selectedIds.length > 0 && (
              <span className="selected-info">
                - {selectedIds.length} selected
              </span>
            )}
          </div>
          <div className="selection-actions">
            {selectedIds.length === 0 ? (
              <button className="btn-select-action" onClick={selectAll} type="button">
                <CheckSquare size={14} />
                Select All
              </button>
            ) : (
              <button className="btn-select-action" onClick={clearSelection} type="button">
                Clear Selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid layout based on number of items */}
      <div className={`generation-results-grid count-${generations.length}`}>
        {generations.map((gen) => {
          const isSelected = selectedIds.includes(gen.id);
          const isHovered = hoveredId === gen.id;
          const isCompleted = gen.status === GENERATION_STATUS.COMPLETED;
          const isProcessing = gen.status === GENERATION_STATUS.PROCESSING;

          return (
            <div
              key={gen.id}
              className={`result-card ${isSelected ? 'selected' : ''} ${isProcessing ? 'processing' : ''}`}
              onMouseEnter={() => setHoveredId(gen.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => isCompleted && handleSelect(gen)}
              onKeyDown={(event) => handleCardKeyDown(event, gen, isCompleted)}
              role={isCompleted ? 'button' : undefined}
              tabIndex={isCompleted ? 0 : -1}
              aria-label={isCompleted ? 'Open generated result' : 'Result is still generating'}
            >
              {/* Media Preview - Full Size */}
              <div className="result-media-container">
                {isProcessing && (
                  <div className="processing-overlay">
                    <div className="processing-spinner" />
                    <span className="processing-text">Generating...</span>
                    {gen.progress > 0 && (
                      <div className="processing-progress">
                        <div 
                          className="processing-progress-fill" 
                          style={{ width: `${gen.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {isCompleted && gen.media_type === 'video' && (
                  <video
                    src={resolveVideoSource(gen.storage_path)}
                    className="result-media"
                    loop
                    muted
                    playsInline
                    autoPlay={isHovered}
                  />
                )}

                {isCompleted && gen.media_type === 'image' && (
                  gen.storage_path ? (
                    <img
                      key={gen.storage_path}
                      src={gen.storage_path}
                      alt="Generated content"
                      className="result-media"
                      loading="lazy"
                    />
                  ) : (
                    <div className="processing-overlay">
                      <span className="processing-text">Image not available</span>
                    </div>
                  )
                )}

                {/* Carousel slide number badge - only shown for carousel slides */}
                {gen.carousel_slide_total > 1 && (
                  <div className="slide-number-badge">
                    {(gen.carousel_slide_index ?? 0) + 1} / {gen.carousel_slide_total}
                  </div>
                )}

                {/* Hover Overlay with Actions */}
                {isCompleted && isHovered && (
                  <div className="result-overlay">
                    <div className="overlay-top">
                      <button
                        className={`selection-btn ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => toggleSelection(gen.id, e)}
                        type="button"
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                    </div>

                    <div className="overlay-bottom">
                      <button
                        className="action-icon-btn"
                        onClick={(e) => handleDownload(gen, e)}
                        title="Download"
                        type="button"
                      >
                        <Download size={18} />
                      </button>

                      <button
                        className="action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(gen);
                        }}
                        title="Use for Post"
                        type="button"
                      >
                        <Maximize2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Info */}
              {isCompleted && (
                <div className="result-card-footer">
                  <div className="result-meta">
                    <span className="meta-badge">{gen.media_type}</span>
                    <span className="meta-divider">-</span>
                    <span className="meta-text">
                      {(gen.metadata?.width ?? '?')}x{(gen.metadata?.height ?? '?')}
                    </span>
                    {gen.media_type === 'video' && gen.metadata?.duration && (
                      <>
                        <span className="meta-divider">-</span>
                        <span className="meta-text">{gen.metadata.duration}s</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Actions Bar (only when items are selected) */}
      {selectedIds.length > 0 && (
        <div className="batch-actions-bar">
          <span className="selected-count">
            {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
          </span>
          <div className="batch-actions-buttons">
            <button 
              className="btn-batch-action secondary"
              onClick={downloadSelected}
              type="button"
            >
              <Download size={14} />
              Download ({selectedIds.length})
            </button>
            <button 
              className="btn-batch-action primary"
              onClick={useSelected}
              type="button"
            >
              Use for Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

