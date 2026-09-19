import { useCallback, useEffect, useRef, useState } from 'react';
import * as assessmentService from '../services/assessmentService';

const DEVTOOLS_KEYS = new Set(['F12']);

function isDevToolsShortcut(e) {
  if (DEVTOOLS_KEYS.has(e.key)) return true;
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) return true;
  if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U') return true;
  return false;
}

/**
 * Wires up the practical browser-level integrity signals described in the
 * spec: tab visibility, window focus, fullscreen exit, copy/paste,
 * right-click, and devtools shortcuts. Hard violations (tab switch, blur,
 * fullscreen exit, devtools shortcut) are reported to the backend, which
 * is the sole authority on warning counts and termination — this hook
 * only reflects what the server decides.
 *
 * This cannot detect a second physical device or another computer; it is
 * a best-effort browser-level deterrent, not a guarantee.
 */
export default function useTestIntegrity(attemptId, { onTerminated, active }) {
  const [warning, setWarning] = useState(null); // { count, max } | null
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const reportingRef = useRef(false);

  const report = useCallback(
    async (type) => {
      if (!active || reportingRef.current) return;
      reportingRef.current = true;
      try {
        const res = await assessmentService.reportViolation(attemptId, type);
        const { terminated, warningCount, maxWarnings } = res.data.data;
        if (terminated) {
          onTerminated?.();
        } else {
          setWarning({ count: warningCount, max: maxWarnings });
        }
      } catch {
        // Non-fatal — integrity reporting failures should not block the test.
      } finally {
        reportingRef.current = false;
      }
    },
    [active, attemptId, onTerminated]
  );

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') report('tab_switch');
    };
    const onBlur = () => report('window_blur');
    const onFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setFullscreenActive(isFs);
      if (!isFs) report('fullscreen_exit');
    };
    const onContextMenu = (e) => {
      e.preventDefault();
      assessmentService.reportViolation(attemptId, 'right_click').catch(() => {});
    };
    const onCopy = (e) => {
      e.preventDefault();
      assessmentService.reportViolation(attemptId, 'copy').catch(() => {});
    };
    const onPaste = (e) => {
      e.preventDefault();
      assessmentService.reportViolation(attemptId, 'paste').catch(() => {});
    };
    const onKeyDown = (e) => {
      if (isDevToolsShortcut(e)) {
        e.preventDefault();
        report('dev_tools_shortcut');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKeyDown);

    requestFullscreen();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKeyDown);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [active, attemptId, report, requestFullscreen]);

  return { warning, dismissWarning: () => setWarning(null), fullscreenActive, requestFullscreen };
}
