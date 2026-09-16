/**
 * ProfilePhotoUpload Component — Modern Family Platform
 * Device-native profile photo upload control with instant local preview,
 * M3D private storage integration, drag-and-drop, and friendly validation.
 *
 * Used by EditPersonModal and AddPersonModal.
 * Replaces old raw "Photo URL" text fields.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { mediaStorageService } from '../../media/mediaStorageService.js';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { getInitials } from '../../utils/familyHelpers.js';

export default function ProfilePhotoUpload({
  currentPhotoSrc = '',
  personName = '',
  selectedFile = null,
  previewUrl = null,
  isRemoved = false,
  onChange, // ({ file, previewUrl, isRemoved }) => void
  disabled = false,
  isUploading = false,
  uploadProgress = null,
  compact = false,
  label = 'PROFILE PHOTO',
}) {
  const [localError, setLocalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const fileInputRef = useRef(null);

  // Clean up object URL when component unmounts or previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Resolve existing photo URL via M3D private signed URL hook
  const isStoragePath = Boolean(currentPhotoSrc && currentPhotoSrc.startsWith('family/'));
  const resolvedExistingUrl = useMediaUrl(isStoragePath ? currentPhotoSrc : '', currentPhotoSrc);

  // Determine active display source
  let activeDisplayUrl = '';
  if (selectedFile && previewUrl) {
    activeDisplayUrl = previewUrl;
  } else if (!isRemoved && currentPhotoSrc && !imgLoadError) {
    activeDisplayUrl = resolvedExistingUrl || currentPhotoSrc;
  }

  // Handle file selection from device or drag-and-drop
  const handleProcessFile = useCallback(
    (file) => {
      if (!file) return;
      setLocalError('');
      setImgLoadError(false);

      // Validate MIME type, extension, and file size (15MB limit)
      const validation = mediaStorageService.validateFile(file, 'photo');
      if (!validation.valid) {
        let friendlyMsg = validation.error;
        if (validation.error.includes('exceeds maximum allowed limit')) {
          friendlyMsg = 'This image is too large. Maximum size is 15MB.';
        } else if (
          validation.error.includes('Unsupported file format') ||
          validation.error.includes('Invalid file extension')
        ) {
          friendlyMsg = 'Please choose an image file (JPEG, PNG, WebP, HEIC, GIF).';
        }
        setLocalError(friendlyMsg);
        return;
      }

      // Create immediate local preview URL
      try {
        const objectUrl = URL.createObjectURL(file);
        onChange?.({
          file,
          previewUrl: objectUrl,
          isRemoved: false,
        });
      } catch {
        // Fallback to FileReader if createObjectURL fails
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange?.({
            file,
            previewUrl: e.target?.result || '',
            isRemoved: false,
          });
        };
        reader.onerror = () => {
          setLocalError("That image couldn't be read. Try another file.");
        };
        reader.readAsDataURL(file);
      }
    },
    [onChange]
  );

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // Reset file input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Action button handlers
  const handleOpenPicker = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    if (disabled || isUploading) return;
    setLocalError('');
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    onChange?.({
      file: null,
      previewUrl: null,
      isRemoved: true,
    });
  };

  const handleRevert = () => {
    if (disabled || isUploading) return;
    setLocalError('');
    setImgLoadError(false);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    onChange?.({
      file: null,
      previewUrl: null,
      isRemoved: false,
    });
  };

  const personInitials = personName
    ? getInitials({ displayName: personName })
    : '?';

  const hasPhoto = Boolean(activeDisplayUrl);
  const isPendingUpload = Boolean(selectedFile && previewUrl);

  return (
    <div
      className={`ft-profile-photo-control ${compact ? 'ft-profile-photo-control--compact' : ''} ${
        isDragging ? 'ft-profile-photo-control--dragging' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="group"
      aria-label={label}
    >
      {/* Hidden Device File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        tabIndex={-1}
        aria-label={`Select profile photo for ${personName || 'person'}`}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
        }}
      />

      <div className="ft-profile-photo-content">
        {/* Thumbnail Preview Area */}
        <div
          className={`ft-profile-photo-avatar ${isDragging ? 'ft-profile-photo-avatar--hover' : ''}`}
          onClick={!disabled && !isUploading ? handleOpenPicker : undefined}
          title={hasPhoto ? 'Click to change photo' : 'Click to add photo'}
          style={{ cursor: disabled || isUploading ? 'default' : 'pointer' }}
        >
          {hasPhoto ? (
            <img
              src={activeDisplayUrl}
              alt={personName ? `Portrait of ${personName}` : 'Portrait preview'}
              className="ft-profile-photo-img"
              onError={() => setImgLoadError(true)}
            />
          ) : (
            <div className="ft-profile-photo-placeholder">
              <span className="ft-profile-photo-initials">{personInitials}</span>
              <span className="ft-profile-photo-camera-badge" aria-hidden="true">
                📷
              </span>
            </div>
          )}

          {/* Drag Overlay Hint */}
          {isDragging && (
            <div className="ft-profile-photo-drag-overlay">
              <span>Drop</span>
            </div>
          )}
        </div>

        {/* Info & Action Controls */}
        <div className="ft-profile-photo-meta">
          <div className="ft-profile-photo-header-row">
            <span className="ft-profile-photo-label">{label}</span>
            {isPendingUpload && (
              <span className="ft-profile-photo-badge ft-profile-photo-badge--pending">
                Ready to save
              </span>
            )}
            {isRemoved && (
              <span className="ft-profile-photo-badge ft-profile-photo-badge--removed">
                Removed
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="ft-profile-photo-actions">
            {!hasPhoto && !isRemoved ? (
              <button
                type="button"
                className="ft-photo-action-btn ft-photo-action-btn--primary"
                onClick={handleOpenPicker}
                disabled={disabled || isUploading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add photo</span>
              </button>
            ) : isRemoved ? (
              <>
                <button
                  type="button"
                  className="ft-photo-action-btn ft-photo-action-btn--primary"
                  onClick={handleOpenPicker}
                  disabled={disabled || isUploading}
                >
                  <span>Choose new photo</span>
                </button>
                {currentPhotoSrc && (
                  <button
                    type="button"
                    className="ft-photo-action-btn ft-photo-action-btn--subtle"
                    onClick={handleRevert}
                    disabled={disabled || isUploading}
                  >
                    <span>Restore photo</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="ft-photo-action-btn ft-photo-action-btn--secondary"
                  onClick={handleOpenPicker}
                  disabled={disabled || isUploading}
                >
                  <span>Change photo</span>
                </button>
                {isPendingUpload && currentPhotoSrc ? (
                  <button
                    type="button"
                    className="ft-photo-action-btn ft-photo-action-btn--subtle"
                    onClick={handleRevert}
                    disabled={disabled || isUploading}
                  >
                    <span>Revert</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ft-photo-action-btn ft-photo-action-btn--danger"
                    onClick={handleRemove}
                    disabled={disabled || isUploading}
                  >
                    <span>Remove</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Helper hint or file details */}
          <div className="ft-profile-photo-subtext">
            {isPendingUpload && selectedFile ? (
              <span>
                {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            ) : isRemoved ? (
              <span>Portrait will be cleared when you save changes.</span>
            ) : hasPhoto ? (
              <span>Supports JPEG, PNG, WebP, HEIC, GIF up to 15MB</span>
            ) : (
              <span>Choose from your device or drag image here</span>
            )}
          </div>
        </div>
      </div>

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="ft-profile-photo-progress" role="status" aria-live="polite">
          <div className="ft-profile-photo-progress-bar">
            <div
              className="ft-profile-photo-progress-fill"
              style={{ width: `${uploadProgress?.percent || 30}%` }}
            />
          </div>
          <span className="ft-profile-photo-progress-text">
            {uploadProgress?.percent ? `Uploading portrait (${uploadProgress.percent}%)...` : 'Saving portrait...'}
          </span>
        </div>
      )}

      {/* Friendly Error Message */}
      {localError && (
        <div className="ft-profile-photo-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
}
