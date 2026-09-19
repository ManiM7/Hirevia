import { useCallback, useEffect, useRef, useState } from 'react';

const FATAL_ERRORS = new Set(['not-allowed', 'audio-capture', 'service-not-allowed']);

/**
 * Thin wrapper around the browser's native Web Speech API
 * (SpeechRecognition) for real microphone-based speech-to-text. No server
 * or paid API is involved — transcription happens entirely in the browser.
 * Support varies: reliable in Chrome/Edge, unavailable in Firefox and most
 * of Safari, so `supported` must be checked before use.
 *
 * Chrome's recognizer periodically ends a session on its own — even with
 * `continuous = true` — whenever it judges speech to have paused, which it
 * can misjudge during fast or run-on speech. Without auto-restarting, any
 * speech after that silent stop is never captured at all, which is exactly
 * what "works when I speak slowly, captures nothing when I speak fast"
 * looks like. So `onend` restarts the session immediately unless the user
 * explicitly called `stop()` or a fatal error (e.g. mic permission denied)
 * occurred — making listening effectively continuous across those
 * internal restarts, with no gap where speech goes unheard.
 */
export default function useSpeechRecognition() {
  const SpeechRecognitionImpl = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = Boolean(SpeechRecognitionImpl);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const intentionalStopRef = useRef(true);

  useEffect(() => {
    if (!supported) return undefined;

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${text} `;
        } else {
          interim += text;
        }
      }
      setTranscript(finalTranscriptRef.current.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (FATAL_ERRORS.has(event.error)) {
        intentionalStopRef.current = true;
        setError(event.error === 'not-allowed' ? 'Microphone access was denied.' : `Speech recognition error: ${event.error}`);
        setListening(false);
      }
      // Transient errors (e.g. "no-speech", "network", "aborted") are
      // followed by an onend event, which handles restarting below —
      // surfacing them as a hard error here would be misleading since the
      // session recovers on its own.
    };

    recognition.onend = () => {
      if (intentionalStopRef.current) {
        setListening(false);
        return;
      }
      // Not a user-requested stop — the engine ended the session on its
      // own mid-answer. Restart immediately so nothing spoken afterward is
      // lost. A brief try/catch guards against restarting an already-active
      // session if the browser fires onend spuriously.
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      intentionalStopRef.current = true;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError('');
    intentionalStopRef.current = false;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    intentionalStopRef.current = true;
    recognitionRef.current.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return { supported, listening, transcript, interimTranscript, error, start, stop, reset };
}
