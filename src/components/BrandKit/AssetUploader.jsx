// src/components/BrandKit/AssetUploader.jsx
import React, { useRef, useState } from 'react';
import useBrandKitStore             from '../../stores/BrandKitStore';
import { ASSET_STATUS }             from '../../constants/statusEnums';

const ASSET_TYPE_MAP = {
  'image/png':        'logo',
  'image/jpeg':       'image',
  'image/webp':       'image',
  'image/svg+xml':    'logo',
  'application/pdf':  'document',
  'application/msword':       'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'font/ttf':         'font',
  'font/otf':         'font',
  'application/x-font-ttf':  'font',
  'application/x-font-otf':  'font',
  'video/mp4':        'video',
  'video/webm':       'video',
};

export default function AssetUploader({ userId, brandKitId }) {
  const uploadAsset = useBrandKitStore(s => s.uploadAsset);
  const assets      = useBrandKitStore(s => s.assets);
  const updateAsset = useBrandKitStore(s => s.updateAsset);
  const deleteAsset = useBrandKitStore(s => s.deleteAsset);

  const inputRef       = useRef(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [uploadError, setUploadError] = useState(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const asset_type = ASSET_TYPE_MAP[file.type] ?? 'other';
        await uploadAsset(userId, brandKitId, file, { asset_type });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const startEdit = (asset) => {
    setEditingId(asset.id);
    setEditForm({
      name:        asset.name        ?? '',
      description: asset.description ?? '',
      usage_hints: asset.usage_hints ?? '',
      alt_text:    asset.alt_text    ?? '',
      tags:        (asset.tags ?? []).join(', '),
    });
  };

  const saveEdit = async () => {
    await updateAsset(editingId, {
      ...editForm,
      tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditingId(null);
  };

  return (
    <div className="asset-uploader">
      {/* Drop zone */}
      <div
        className={`asset-drop-zone${dragging ? ' dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload brand assets"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.pdf,.doc,.docx,.txt,.md,.ttf,.otf,.mp4,.webm"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading
          ? <span>Uploading…</span>
          : <span>Drop files here or click to upload<br /><small>Logos · Fonts · Brand Docs · Mood Boards</small></span>
        }
      </div>

      {uploadError && (
        <p className="asset-upload-error" role="alert">{uploadError}</p>
      )}

      {/* Asset list */}
      {assets.length > 0 && (
        <div className="asset-list">
          <h4>Uploaded assets ({assets.length})</h4>
          {assets.map(asset => (
            <div key={asset.id} className="asset-row">
              <div className="asset-row-header">
                <span className="asset-icon">{assetIcon(asset.asset_type)}</span>
                <span className="asset-name">{asset.name}</span>
                <span className="asset-type-badge">{asset.asset_type}</span>
                <span className={`asset-status-dot ${asset.status}`} title={asset.status} />
                <button className="asset-btn" onClick={() => startEdit(asset)}>Edit</button>
                <button className="asset-btn danger" onClick={() => deleteAsset(asset.id)}>Delete</button>
              </div>

              {asset.description && (
                <p className="asset-meta">Description: {asset.description}</p>
              )}
              {asset.usage_hints && (
                <p className="asset-meta">Usage: {asset.usage_hints}</p>
              )}
              {asset.status === ASSET_STATUS.READY && asset.extracted_text && (
                <p className="asset-meta extracted-ok">Text extracted ✓</p>
              )}

              {/* Edit form */}
              {editingId === asset.id && (
                <div className="asset-edit-form">
                  {[
                    { label: 'Name', key: 'name', type: 'text' },
                    { label: 'Description', key: 'description', type: 'textarea' },
                    { label: 'Usage hints', key: 'usage_hints', type: 'textarea' },
                    { label: 'Alt text (images)', key: 'alt_text', type: 'text' },
                    { label: 'Tags (comma-separated)', key: 'tags', type: 'text' },
                  ].map(({ label, key, type }) => (
                    <label key={key}>
                      {label}
                      {type === 'textarea'
                        ? <textarea
                            value={editForm[key] ?? ''}
                            onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                          />
                        : <input
                            type="text"
                            value={editForm[key] ?? ''}
                            onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                          />
                      }
                    </label>
                  ))}
                  <div className="asset-edit-actions">
                    <button className="bk-btn-primary" onClick={saveEdit}>Save</button>
                    <button className="bk-btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function assetIcon(type) {
  const map = { logo: '🖼️', font: '🔤', document: '📄', video: '🎬', image: '📷', other: '📁' };
  return map[type] ?? '📁';
}
