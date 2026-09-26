import { useEffect, useState } from 'react';

export default function useHoldTimer(expiresAt) {
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(0);
      return undefined;
    }
    const tick = () => {
      setRemainingMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const expired = Boolean(expiresAt) && remainingMs <= 0;

  return {
    remainingMs,
    minutes,
    seconds,
    expired,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}
