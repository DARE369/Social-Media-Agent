// src/components/Generate/SEOPanel.jsx
import React, { useState } from 'react';

const SCORE_CONFIG = [
  { key: 'platform_alignment', label: 'Platform alignment', max: 20 },
  { key: 'keyword_density',    label: 'Keyword density',    max: 20 },
  { key: 'caption_structure',  label: 'Caption structure',  max: 20 },
  { key: 'hashtag_relevance',  label: 'Hashtag relevance',  max: 20 },
  { key: 'cta_presence',       label: 'CTA presence',       max: 10 },
  { key: 'brand_consistency',  label: 'Brand consistency',  max: 10 },
];

function getScoreColor(score) {
  if (score >= 80) return 'var(--color-success, #22c55e)';
  if (score >= 60) return 'var(--color-info, #3b82f6)';
  if (score >= 40) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-error, #ef4444)';
}

function getReportIcon(type) {
  const map = { improvement: '✓', warning: '◎', info: 'ℹ' };
  return map[type] ?? 'ℹ';
}

/**
 * Displays SEO score, breakdown, improvement report, and editable outputs.
 *
 * Props:
 *   seo: ContentPlan['seo'] — the seo block from the ContentPlan
 *   onChange: (field, value) => void — called when user edits title/caption/hashtags
 */
export default function SEOPanel({ seo, onChange }) {
  const [hashtagInput, setHashtagInput] = useState(
    (seo?.optimized_hashtags ?? []).join(' ')
  );

  if (!seo) return null;

  const { score = 0, score_category = 'Poor', score_breakdown = {}, improvement_report = [],
          optimized_title = '', optimized_caption = '', optimized_hashtags = [] } = seo;

  const scoreColor = getScoreColor(score);

  return (
    <div className="seo-panel">
      {/* Overall score */}
      <div className="seo-score-header">
        <span className="seo-label">Optimization Score</span>
        <span className="seo-score-number" style={{ color: scoreColor }}>{score}%</span>
        <span className="seo-category-badge" data-category={score_category}>{score_category}</span>
      </div>

      <div className="seo-progress-bar" aria-label={`SEO score: ${score}%`}>
        <div className="seo-progress-fill" style={{ width: `${score}%`, background: scoreColor }} />
      </div>

      {/* Dimension breakdown */}
      <div className="seo-breakdown">
        <h4>Score Breakdown</h4>
        {SCORE_CONFIG.map(({ key, label, max }) => {
          const dim = score_breakdown[key] ?? { score: 0, max, rationale: '' };
          const pct = Math.round(((dim.score ?? 0) / max) * 100);
          return (
            <div key={key} className="seo-dimension" title={dim.rationale}>
              <span className="seo-dim-label">{label}</span>
              <div className="seo-dim-bar">
                <div className="seo-dim-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="seo-dim-score">{dim.score ?? 0}/{max}</span>
            </div>
          );
        })}
      </div>

      {/* Improvement report */}
      {improvement_report.length > 0 && (
        <div className="seo-report">
          <h4>What we improved:</h4>
          {improvement_report.map((item, i) => (
            <div key={i} className={`seo-report-item ${item.type}`}>
              <span className="seo-report-icon">{getReportIcon(item.type)}</span>
              <span className="seo-report-bullet">{item.bullet}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editable outputs */}
      <div className="seo-outputs">
        <label>
          Optimized Title
          <input
            type="text"
            value={optimized_title}
            onChange={e => onChange?.('optimized_title', e.target.value)}
          />
        </label>

        <label>
          Optimized Caption
          <textarea
            rows={5}
            value={optimized_caption}
            onChange={e => onChange?.('optimized_caption', e.target.value)}
          />
        </label>

        <label>
          Hashtags ({optimized_hashtags.length})
          <input
            type="text"
            value={hashtagInput}
            onChange={e => {
              setHashtagInput(e.target.value);
              const tags = e.target.value.split(/\s+/).filter(t => t.startsWith('#'));
              onChange?.('optimized_hashtags', tags);
            }}
          />
          <small>Space-separated. Each tag must start with #</small>
        </label>
      </div>
    </div>
  );
}
