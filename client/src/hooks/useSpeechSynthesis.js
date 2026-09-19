import { useCallback, useEffect, useRef, useState } from 'react';

const FEMALE_NAME_HINTS = ['female', 'zira', 'samantha', 'victoria', 'susan', 'karen', 'moira', 'tessa', 'salli', 'joanna'];
const MALE_NAME_HINTS = ['male', 'david', 'daniel', 'alex', 'fred', 'george', 'james', 'mark', 'matthew', 'guy'];

function scoreVoice(voice, wantGender) {
  const name = voice.name.toLowerCase();
  const hints = wantGender === 'female' ? FEMALE_NAME_HINTS : MALE_NAME_HINTS;
  const oppositeHints = wantGender === 'female' ? MALE_NAME_HINTS : FEMALE_NAME_HINTS;
  if (hints.some((h) => name.includes(h))) return 2;
  if (oppositeHints.some((h) => name.includes(h))) return -1;
  return 0;
}

/**
 * Picks a voice from the browser's native SpeechSynthesis engine that best
 * matches the requested gender, using common voice-name patterns shipped
 * by Chrome/Edge/Windows/macOS (e.g. "Microsoft Zira" = female,
 * "Microsoft David" = male). This is a best-effort match against whatever
 * voices the user's OS/browser actually ships — not every system has a
 * clearly gendered voice available, so a graceful fallback to the first
 * English voice is used when nothing matches.
 */
export default function useSpeechSynthesis() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

  const pickVoice = useCallback(
    (wantGender) => {
      const englishVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
      const pool = englishVoices.length > 0 ? englishVoices : voices;
      if (pool.length === 0) return null;
      const ranked = [...pool].sort((a, b) => scoreVoice(b, wantGender) - scoreVoice(a, wantGender));
      return ranked[0];
    },
    [voices]
  );

  const speak = useCallback(
    (text, gender, { onEnd } = {}) => {
      if (!supported) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(gender);
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, pickVoice]
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
