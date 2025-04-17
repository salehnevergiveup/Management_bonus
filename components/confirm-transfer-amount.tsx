"use client"

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { threadId } from 'worker_threads';

interface ConfirmTransferDialogProps {
  data: {
    processId: string;
    title: string;
    message: string;
    thread_id: string;
    timeout?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

const ConfirmTransferDialog: React.FC<ConfirmTransferDialogProps> = ({ data, isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle user confirmation (Yes)
  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/confirm-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          confirmation: true,  
          threadId: data.thread_id 

        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit confirmation');
      }

      // Close the dialog after successful submission
      onClose();
    } catch (error) {
      console.error('Error submitting confirmation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user rejection (No)
  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/confirm-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          confirmation: false 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit rejection');
      }

      // Close the dialog after successful submission
      onClose();
    } catch (error) {
      console.error('Error submitting rejection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 whitespace-pre-wrap mb-6">{data.message}</p>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'No'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmTransferDialog;