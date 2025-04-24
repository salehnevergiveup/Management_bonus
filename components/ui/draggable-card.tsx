"use client"

import { useState, useRef, useEffect, ReactNode } from "react"

interface DraggableCardProps {
  children: ReactNode
  title: string
  badge?: ReactNode
  timer?: ReactNode
  onClose: () => void
}

const DraggableCard = ({ children, title, badge, timer, onClose }: DraggableCardProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={cardRef}
      className="bg-white rounded-lg shadow-lg border border-gray-200 w-96 max-w-full"
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 100 : 100
      }}
    >
      <div 
        className="p-4 border-b drag-handle flex justify-between items-center" 
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="ml-2">{badge}</div>
        <button
          className="ml-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {timer && (
        <div className="px-4 py-2 border-b bg-gray-50">
          {timer}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default DraggableCard;