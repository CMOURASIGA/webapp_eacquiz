
import { useState, useEffect } from 'react';

export const useQuestionTimer = (startTime: number, durationSeconds: number, onExpire?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Reset quando o startTime muda (nova pergunta)
    if (startTime > 0) {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      
      setTimeLeft(remaining);
      setIsExpired(remaining <= 0);
    } else {
      setTimeLeft(durationSeconds);
      setIsExpired(false);
    }
  }, [startTime, durationSeconds]);

  useEffect(() => {
    if (!startTime || startTime <= 0 || isExpired) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
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
