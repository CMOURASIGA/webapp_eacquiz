
import { useState, useEffect, useRef } from 'react';

export const useQuestionTimer = (startTime: number, durationSeconds: number, onExpire?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);

  // Keep ref up to date to avoid stale closures
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!startTime || startTime <= 0) {
      setTimeLeft(durationSeconds);
      setIsExpired(false);
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        if (onExpireRef.current) onExpireRef.current();
      }
    };

    // Initial calculation
    calculate();

    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationSeconds, isExpired]);

  return {
    timeLeft,
    isUrgent: timeLeft <= 10 && timeLeft > 0,
    isExpired
  };
};
