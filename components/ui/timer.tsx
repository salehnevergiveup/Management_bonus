"use client"

import { useState, useEffect } from "react"

interface TimerProps {
  seconds: number
  onTimeout: () => void
}

const Timer = ({ seconds, onTimeout }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    
    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [timeLeft, onTimeout]);
  
  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  
  return (
    <div className={`text-sm font-medium ${timeLeft < 30 ? 'text-red-500' : ''}`}>
      Time remaining: {minutes}:{secs.toString().padStart(2, '0')}
    </div>
  );
};

export default Timer;