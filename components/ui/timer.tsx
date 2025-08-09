"use client"

import { useState, useEffect } from "react"

interface TimerProps {
  seconds: number
  onTimeout: () => void
  formId?: string // Optional form ID for debugging
}

const Timer = ({ seconds, onTimeout, formId }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  

  
  useEffect(() => {
    // Reset timer when seconds prop changes (e.g., from server sync)
    setTimeLeft(seconds);
    setHasTimedOut(false);
  }, [seconds]);
  
  useEffect(() => {
    if (timeLeft <= 0 && !hasTimedOut) {
      setHasTimedOut(true);
      onTimeout();
      return;
    }
    
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timerId);
    }
  }, [timeLeft, onTimeout, formId, hasTimedOut]);
  
  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  
  return (
    <div className={`text-sm font-medium ${timeLeft < 30 ? 'text-red-500' : ''}`}>
      Time remaining: {minutes}:{secs.toString().padStart(2, '0')}
    </div>
  );
};

export default Timer;