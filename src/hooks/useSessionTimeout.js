import { useState, useCallback, useEffect, useRef } from "react";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING = 25 * 60 * 1000; // 25 minutes — warn at 5 min remaining

export default function useSessionTimeout(authed, onTimeout) {
  const [showWarning, setShowWarning] = useState(false);
  const lastActivity = useRef(Date.now());
  const warningTimer = useRef(null);
  const logoutTimer = useRef(null);

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);
    if (authed) {
      warningTimer.current = setTimeout(() => setShowWarning(true), SESSION_WARNING);
      logoutTimer.current = setTimeout(() => onTimeout(), SESSION_TIMEOUT);
    }
  }, [authed, onTimeout]);

  useEffect(() => {
    if (!authed) { setShowWarning(false); return; }
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [authed, resetTimers]);

  return { showWarning, dismissWarning: () => setShowWarning(false) };
}
