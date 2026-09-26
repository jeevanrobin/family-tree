/**
 * StoryAudio — plays a story's voice recording (cloud path or local data URL).
 */

import React from 'react';
import { useMediaUrl } from '../hooks/useMediaUrl.js';
import { DOCUMENT_BUCKET } from '../media/mediaStorageService.js';

const LANGUAGE = { 'te-IN': 'Telugu', 'en-IN': 'English', 'hi-IN': 'Hindi' };

// Browser-recorded WebM files carry no duration, so the player shows no seek
// bar length. Seeking far past the end makes the browser compute it.
function fixUnknownDuration(e) {
  const audio = e.currentTarget;
  if (audio.duration !== Infinity) return;
  const restore = () => {
    audio.removeEventListener('timeupdate', restore);
    audio.currentTime = 0;
  };
  audio.addEventListener('timeupdate', restore);
  audio.currentTime = 1e101;
}

export default function StoryAudio({ story, className = 'ft-story-audio' }) {
  const url = useMediaUrl(story?.audioPath || '', story?.audioSrc || '', DOCUMENT_BUCKET);
  if (!story?.audioPath && !story?.audioSrc) return null;
  const secs = story.audioDurationSec;
  const minutes = secs ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : null;
  const label = [
    'Voice recording',
    minutes,
    story.transcriptLanguage ? `transcribed from ${LANGUAGE[story.transcriptLanguage] || story.transcriptLanguage}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <figure className="ft-story-audio-figure">
      {url ? (
        <audio
          className={className}
          controls
          preload="metadata"
          src={url}
          aria-label={label}
          onLoadedMetadata={fixUnknownDuration}
        />
      ) : null}
      <figcaption>🎙 {label}</figcaption>
    </figure>
  );
}
