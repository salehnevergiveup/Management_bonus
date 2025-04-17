"use client"

import React from 'react';
import { X } from 'lucide-react';

interface DetailsDialogProps {
  data: {
    title: string;
    message: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const DetailsDialog: React.FC<DetailsDialogProps> = ({ data, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg p-1.5 inline-flex items-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 whitespace-pre-wrap">{data.message}</p>
        </div>
      </div>
    </div>
  );
};

export default DetailsDialog;