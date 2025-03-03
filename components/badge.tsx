"use client";

import React from "react";

interface BadgeProps {
  color: string; 
  text: string;
}

export const Badge: React.FC<BadgeProps> = ({ color, text }) => {
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${color}`}>
      {text}
    </span>
  );
};
