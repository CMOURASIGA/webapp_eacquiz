
import { useState, useEffect } from 'react';

export const useQuestionTimer = (startTime: number, durationSeconds: number, onExpire?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isExpired, setIsExpired] = useState(false);

  // Reset local state when a new question starts
  useEffect(() => {
    if (startTime > 0) {
      setIsExpired(false);
      // Initialize timeLeft immediately based on current drift
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeLeft(Math.max(0, durationSeconds - elapsed));
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
        if (onExpire) {
          onExpire();
        }
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
