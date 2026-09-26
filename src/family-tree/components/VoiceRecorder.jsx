/**
 * VoiceRecorder — record an elder telling a story, right in the browser.
 *
 * Recording uses MediaRecorder and stays on this device until the story is
 * saved. Live transcription is optional and uses the browser's built-in
 * speech recognition (Chrome and Edge send that audio to their speech
 * service), so it is off by default and says so.
 */

import React, { useEffect, useRef, useState } from 'react';

export const MAX_RECORDING_SECONDS = 10 * 60;

const TRANSCRIPT_LANGUAGES = [
  { code: 'te-IN', label: 'తెలుగు Telugu' },
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी Hindi' },
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * @param {Object} props
 * @param {string} [props.existingUrl] playable URL of an already saved recording
 * @param {(rec: {blob: Blob, url: string, mimeType: string, durationSec: number, language: string|null} | null) => void} props.onChange
 * @param {(text: string) => void} [props.onTranscript] receives final transcript chunks
 */
export default function VoiceRecorder({ existingUrl = '', onChange, onTranscript }) {
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && pickMimeType() !== null;
  const [state, setState] = useState('idle'); // idle | recording | recorded
  const [elapsed, setElapsed] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [error, setError] = useState('');
  const [transcribe, setTranscribe] = useState(false);
  const [language, setLanguage] = useState('te-IN');
  const [interim, setInterim] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const recognitionRef = useRef(null);

  const stopEverything = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;
  };

  useEffect(() => () => {
    stopEverything();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTranscription = () => {
    if (!SpeechRecognitionImpl) return;
    const rec = new SpeechRecognitionImpl();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) onTranscript?.(text.trim());
        else partial += text;
      }
      setInterim(partial);
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`Transcription stopped (${e.error}). The recording continues.`);
    };
    // Recognition ends on long pauses; keep it going while recording.
    rec.onend = () => {
      if (recognitionRef.current === rec && recorderRef.current?.state === 'recording') {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  };

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
        setRecordingUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setState('recorded');
        setInterim('');
        onChange?.({ blob, url, mimeType: type, durationSec, language: transcribe ? language : null });
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(1000);
      setElapsed(0);
      setState('recording');
      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(secs);
        if (secs >= MAX_RECORDING_SECONDS) stop();
      }, 250);
      if (transcribe) startTranscription();
    } catch (err) {
      stopEverything();
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow the microphone for this site to record.'
          : `Could not start recording: ${err?.message || err}`
      );
    }
  };

  const stop = () => {
    const recorder = recorderRef.current;
    stopEverything();
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const discard = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl('');
    setState('idle');
    setElapsed(0);
    onChange?.(null);
  };

  if (!supported) {
    return (
      <p className="ft-voice__note">
        Voice recording isn’t supported in this browser. Try Chrome, Edge, Firefox or Safari 14.1+.
      </p>
    );
  }

  const playable = recordingUrl || existingUrl;

  return (
    <div className="ft-voice">
      <div className="ft-voice__controls">
        {state === 'recording' ? (
          <button type="button" className="ft-voice__btn ft-voice__btn--stop" onClick={stop}>
            <span className="ft-voice__dot" aria-hidden="true" /> Stop · {formatTime(elapsed)}
          </button>
        ) : (
          <button type="button" className="ft-voice__btn" onClick={start}>
            🎙 {playable ? 'Record again' : 'Record voice'}
          </button>
        )}
        {state === 'recorded' && (
          <button type="button" className="ft-voice__link" onClick={discard}>
            Discard new recording
          </button>
        )}
        <span className="ft-voice__limit">Up to {MAX_RECORDING_SECONDS / 60} minutes</span>
      </div>

      {SpeechRecognitionImpl && state !== 'recording' && (
        <div className="ft-voice__transcribe">
          <label>
            <input type="checkbox" checked={transcribe} onChange={(e) => setTranscribe(e.target.checked)} /> Type out
            what is said
          </label>
          {transcribe && (
            <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Transcription language">
              {TRANSCRIPT_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
          {transcribe && (
            <p className="ft-voice__note">
              Uses your browser’s speech service (Chrome and Edge send the audio to Google or Microsoft). The text is
              added to the story below, where you can correct it.
            </p>
          )}
        </div>
      )}

      {interim && <p className="ft-voice__interim">{interim}</p>}
      {playable && state !== 'recording' && <audio className="ft-voice__player" controls src={playable} preload="metadata" />}
      {error && <p className="ft-voice__error" role="alert">{error}</p>}
    </div>
  );
}
