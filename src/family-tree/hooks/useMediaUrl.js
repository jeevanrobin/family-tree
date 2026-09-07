/**
 * useMediaUrl Hook — Medida's Family (Milestone 3D)
 *
 * Resolves short-lived signed URLs for private Supabase Storage files
 * with zero-flicker synchronous cache hits and automated async refresh.
 */

import { useState, useEffect } from 'react';
import { mediaStorageService, PHOTO_BUCKET } from '../media/mediaStorageService.js';

export function useMediaUrl(storagePath, fallbackSrc = '', bucket = PHOTO_BUCKET) {
  const [url, setUrl] = useState(() => {
    if (!storagePath) return fallbackSrc || '';

    // Synchronous cache hit check
    const cacheKey = `${bucket}:${storagePath}`;
    const cached = mediaStorageService.urlCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt - 5 * 60 * 1000) {
      return cached.url;
    }
    return fallbackSrc || '';
  });

  useEffect(() => {
    let isMounted = true;

    if (!storagePath) {
      setUrl(fallbackSrc || '');
      return;
    }

    // Check synchronous cache first
    const cacheKey = `${bucket}:${storagePath}`;
    const cached = mediaStorageService.urlCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt - 5 * 60 * 1000) {
      setUrl(cached.url);
      return;
    }

    mediaStorageService
      .getSignedUrl(bucket, storagePath)
      .then((signedUrl) => {
        if (isMounted && signedUrl) {
          setUrl(signedUrl);
        } else if (isMounted && !signedUrl && fallbackSrc) {
          setUrl(fallbackSrc);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUrl(fallbackSrc || '');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [storagePath, fallbackSrc, bucket]);

  return url || fallbackSrc || '';
}

export default useMediaUrl;
