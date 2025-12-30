
import { useState, useEffect } from 'react';

export const useQuestionTimer = (startTime: number, durationSeconds: number, onExpire?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, durationSeconds, onExpire, isExpired]);

  return {
    timeLeft,
    isUrgent: timeLeft <= 10 && timeLeft > 0,
    isExpired
  };
};
