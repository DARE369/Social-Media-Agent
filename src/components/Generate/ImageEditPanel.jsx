import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Upload, X, Images } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFilename(name = 'image') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function extractErrorMessage(error, fallback = 'Upload failed') {
  if (!error) return fallback;
  if (error instanceof Error) return error.message || fallback;
  return String(error.message || fallback);
}

async function uploadSourceImageWithProgress(file, onProgress) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (!session?.access_token || !user?.id) {
    throw new Error('Please sign in again before uploading.');
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase frontend configuration.');
  }

  const filePath = `${user.id}/edit-source/${Date.now()}_${sanitizeFilename(file.name)}`;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `${supabaseUrl}/storage/v1/object/generated_assets/${encodePath(filePath)}`;

    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      if (typeof onProgress === 'function') onProgress(progress);
    };

    xhr.onerror = () => reject(new Error('Network error while uploading source image.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(null);
        return;
      }

      let detail = xhr.responseText || '';
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        detail = parsed.message || parsed.error || detail;
      } catch (_err) {
        // Keep raw response text.
      }

      reject(new Error(detail || 'Source image upload failed.'));
    };

    xhr.send(file);
  });

  const { data } = supabase.storage.from('generated_assets').getPublicUrl(filePath);
  return data.publicUrl;
}

export default function ImageEditPanel({
  onSubmit,
  isGenerating,
  recentGenerations = [],
}) {
  const fileInputRef = useRef(null);
  const [instruction, setInstruction] = useState('');
  const [source, setSource] = useState(null); // { type, previewUrl, url, file }
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [fileError, setFileError] = useState('');
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const recentImages = useMemo(
    () => recentGenerations
      .filter((item) => item?.media_type === 'image' && item?.status === 'completed' && item?.storage_path)
      .slice(0, 12),
    [recentGenerations],
  );

  useEffect(() => () => {
    if (source?.type === 'file' && source.previewUrl) {
      URL.revokeObjectURL(source.previewUrl);
    }
  }, [source]);

  const canSubmit = Boolean(source && instruction.trim().length > 0) && !isGenerating && !isUploadingSource;

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return 'Please upload a PNG, JPG, or WEBP image under 10 MB.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'Please upload a PNG, JPG, or WEBP image under 10 MB.';
    }
    return null;
  };

  const handleFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFileError('');
    setShowLibrary(false);
    const previewUrl = URL.createObjectURL(file);
    setSource({
      type: 'file',
      file,
      previewUrl,
      url: null,
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const handlePickLibrary = (url) => {
    setFileError('');
    setShowLibrary(false);
    setSource({
      type: 'library',
      previewUrl: url,
      url,
      file: null,
    });
  };

  const clearSource = () => {
    if (source?.type === 'file' && source.previewUrl) {
      URL.revokeObjectURL(source.previewUrl);
    }
    setSource(null);
    setUploadProgress(0);
  };

  const resolveSourceUrl = async () => {
    if (!source) throw new Error('Please choose a source image.');
    if (source.url) return source.url;
    if (!source.file) throw new Error('Source image is missing.');

    setIsUploadingSource(true);
    setUploadProgress(0);
    try {
      const uploadedUrl = await uploadSourceImageWithProgress(source.file, setUploadProgress);
      setSource((prev) => prev ? { ...prev, url: uploadedUrl } : prev);
      return uploadedUrl;
    } finally {
      setIsUploadingSource(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const sourceImageUrl = await resolveSourceUrl();
      await onSubmit({
        sourceImageUrl,
        instruction: instruction.trim(),
      });
      setInstruction('');
      clearSource();
    } catch (error) {
      setFileError(extractErrorMessage(error, 'Failed to submit edit request.'));
    }
  };

  return (
    <div className="image-edit-panel" role="region" aria-label="Image edit input">
      <div className="edit-panel-header">
        <ImageIcon size={15} aria-hidden="true" />
        <span>Edit Mode</span>
      </div>

      <div
        className={`edit-drop-zone${isDragging ? ' dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Drop or upload source image"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = '';
          }}
        />

        {!source && (
          <>
            <Upload size={20} aria-hidden="true" />
            <span>Drop image here or click to upload</span>
            <small>PNG, JPG, WEBP - max 10MB</small>
            <div className="edit-drop-zone-actions">
              <span className="edit-or-divider">or</span>
              <button
                type="button"
                className="edit-library-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowLibrary((prev) => !prev);
                }}
              >
                <Images size={14} />
                Pick from Library
              </button>
            </div>
          </>
        )}

        {source && (
          <div className="edit-preview-container">
            <img src={source.previewUrl} alt="Edit source" className="edit-preview-image" />
            <button
              type="button"
              className="edit-preview-clear"
              onClick={(event) => {
                event.stopPropagation();
                clearSource();
              }}
              aria-label="Clear source image"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {showLibrary && (
          <div
            className="edit-library-overlay"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Recent generated images"
          >
            {recentImages.length === 0 ? (
              <p className="edit-library-empty">No recent generated images yet.</p>
            ) : (
              <div className="edit-library-grid">
                {recentImages.map((item) => (
                  <img
                    key={item.id}
                    src={item.storage_path}
                    alt="Recent generation"
                    className="edit-library-thumb"
                    onClick={() => handlePickLibrary(item.storage_path)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isUploadingSource && (
        <div className="edit-upload-progress">
          <div className="edit-upload-progress-track">
            <div className="edit-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span>{uploadProgress}%</span>
        </div>
      )}

      {fileError && (
        <p className="edit-file-error" role="alert">
          {fileError}
        </p>
      )}

      <div className="edit-instruction-area">
        <label className="edit-instruction-label" htmlFor="edit-instruction-input">Edit instruction</label>
        <textarea
          id="edit-instruction-input"
          rows={3}
          placeholder="Change the background to a bright studio and keep product shadows natural."
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          disabled={isGenerating || isUploadingSource}
        />
      </div>

      <div className="edit-actions">
        <button
          type="button"
          className="btn-send"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {(isGenerating || isUploadingSource) ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>{isUploadingSource ? 'Uploading...' : 'Applying...'}</span>
            </>
          ) : (
            <>
              <ImageIcon size={16} aria-hidden="true" />
              <span>Apply Edit</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
