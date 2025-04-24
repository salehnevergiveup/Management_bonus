"use client"

import React, { useState, useEffect } from 'react';
import LiveNotification from '@components/live-notifications';
import VerificationOptionsForm from '@/components/verification-options-form';
import VerificationCodeForm from '@/components/verification-code-form';
import DetailsDialog from '@/components/details-dialog';
import ConfirmTransferDialog from '@components/confirm-dialog';
import { Events, FormType } from '@constants/enums';
import ProcessProgressDialog from '@/components/process-progress-dialog';

type BaseFormData = {
  formId: string;
  thread_id: string;
  processId: string;
  isOpen: boolean;
  timestamp: number;
  type: string;
  timeout?: number;
  [key: string]: any; 
};

const SSEListener = ({ 
}) => {
  const [eventType, setEventType] = useState('connection');
  const [notificationData, setNotificationData] = useState<any>(null);
  
  // Different form states - separated by type
  const [verificationOptionsForms, setVerificationOptionsForms] = useState<BaseFormData[]>([]);
  const [verificationCodeForms, setVerificationCodeForms] = useState<BaseFormData[]>([]);
 
  // Confirm transfer dialog state
  const [confirmTransferData, setConfirmTransferData] = useState<any>(null);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);

  // Process progress dialog state
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
 
    eventSource.addEventListener('connected', (event) => {
      setEventType('connection');
      console.log('app is connected'); 
    });
    
    eventSource.addEventListener('notification', (event) => {
      setEventType('notification');
      try {
        const parsedData = JSON.parse(event.data);
        setNotificationData(parsedData);
      } catch (err) {
        console.error('Error parsing notification event data:', err);
      }
    });

    // Event listener for verification option forms
    eventSource.addEventListener(Events.VERIFICATION_OPTIONS, (event) => {
      setEventType(Events.VERIFICATION_OPTIONS);
      try {
        const parsedData = JSON.parse(event.data);
        const formId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Create a new form object with ID and open state
        const newForm: BaseFormData = {
          ...parsedData,
          formId,
          isOpen: true,
          timestamp: Date.now(),
          type: FormType.verification_method // Ensure correct type
        };
        
        handleNewVerificationOptionsForm(newForm);
        
        // Set timeout to auto-close if provided
        if (parsedData.timeout && typeof parsedData.timeout === 'number') {
          setTimeout(() => {
            closeVerificationOptionsForm(formId);
          }, parsedData.timeout * 1000);
        }
      } catch (err) {
        console.error('Error parsing verification option event data:', err);
      }
    });

    // Event listener for verification code forms
    eventSource.addEventListener(Events.VERIFICATION_CODE, (event) => {
      setEventType(Events.VERIFICATION_CODE);
      try {
        const parsedData = JSON.parse(event.data);
        const formId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Create a new form object with ID and open state
        const newForm: BaseFormData = {
          ...parsedData,
          formId,
          isOpen: true,
          timestamp: Date.now(),
          type: FormType.verification // Ensure correct type
        };
        
        handleNewVerificationCodeForm(newForm);
        
        // Set timeout to auto-close if provided
        if (parsedData.timeout && typeof parsedData.timeout === 'number') {
          setTimeout(() => {
            closeVerificationCodeForm(formId);
          }, parsedData.timeout * 1000);
        }
      } catch (err) {
        console.error('Error parsing verification code event data:', err);
      }
    });

    // Event listener for process_tracker - direct control approach
    eventSource.addEventListener(Events.PROGRESS_TRACKER, (event) => {
      setEventType(Events.PROGRESS_TRACKER);
      try {
        setShowProgress(true);
      } catch (err) {
        console.error('Error handling process tracker event:', err);
      }
    });
    
    // Event listener for confirm_transfer
    eventSource.addEventListener(Events.CONFIRMATION_DIALOG, (event) => {
      console.log("event is triggered ====================================")

      setEventType(Events.CONFIRMATION_DIALOG);
      try {
        const parsedData = JSON.parse(event.data);
        setConfirmTransferData(parsedData);
        setShowConfirmTransfer(true);
        
        // Set timeout to auto-close if provided
        if (parsedData.timeout && typeof parsedData.timeout === 'number') {
          setTimeout(() => {
            closeConfirmTransferDialog();
          }, parsedData.timeout * 1000);
        }
      } catch (err) {
        console.error('Error parsing confirm_transfer event data:', err);
      }
    });
   
    eventSource.addEventListener('progress', (event) => {
      setEventType('progress');
      try {
        const parsedData = JSON.parse(event.data);
      } catch (err) {
        console.error('Error parsing progress event data:', err);
      }
    });

    eventSource.onerror = (error) => {
      console.log('EventSource failed:', error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Handler for new verification method forms
  const handleNewVerificationOptionsForm = (newForm: BaseFormData) => {
    setVerificationOptionsForms((prevForms) => {
      // Check if there's already an open form with the same thread_id
      const existingOpenForms = prevForms.filter(
        (f) => f.thread_id === newForm.thread_id && f.isOpen
      );
      
      let updatedForms = [...prevForms];
      
      // Close any existing forms with the same thread_id
      if (existingOpenForms.length > 0) {
        updatedForms = updatedForms.map(form => 
          (form.thread_id === newForm.thread_id && form.isOpen)
            ? { ...form, isOpen: false } 
            : form
        );
      }
      
      return [...updatedForms, newForm];
    });
  };

  // Handler for new verification forms
  const handleNewVerificationCodeForm = (newForm: BaseFormData) => {
    setVerificationCodeForms((prevForms) => {
      // Check if there's already an open form with the same thread_id
      const existingOpenForms = prevForms.filter(
        (f) => f.thread_id === newForm.thread_id && f.isOpen
      );
      
      let updatedForms = [...prevForms];
      
      if (existingOpenForms.length > 0) {
        updatedForms = updatedForms.map(form => 
          (form.thread_id === newForm.thread_id && form.isOpen)
            ? { ...form, isOpen: false } 
            : form
        );
      }
      
      return [...updatedForms, newForm];
    });
  };

  console.log("Verification option forms:", verificationOptionsForms);
console.log("Verification code forms:");

  // Close handlers for each form type
  const closeVerificationOptionsForm = (formId: string) => {
    setVerificationOptionsForms((prevForms) => 
      prevForms.map((form) => 
        form.formId === formId 
          ? { ...form, isOpen: false } 
          : form
      )
    );
    
    // Clean up after animation
    setTimeout(() => {
      setVerificationOptionsForms((prevForms) => 
        prevForms.filter((form) => form.isOpen || form.formId !== formId)
      );
    }, 3000);
  };

  const closeVerificationCodeForm = (formId: string) => {
    setVerificationCodeForms((prevForms) => 
      prevForms.map((form) => 
        form.formId === formId 
          ? { ...form, isOpen: false } 
          : form
      )
    );
    
    // Clean up after animation
    setTimeout(() => {
      setVerificationCodeForms((prevForms) => 
        prevForms.filter((form) => form.isOpen || form.formId !== formId)
      );
    }, 3000);
  };

  
  const closeConfirmTransferDialog = () => {
    setShowConfirmTransfer(false);
    
    // Clear the data after dialog closes and a short delay
    setTimeout(() => {
      setConfirmTransferData(null);
    }, 300);
  };

  useEffect(() => {
    if (eventType === 'progress' && notificationData) {
      const updateProgress = async () => {
        try {
          const res = await fetch('/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: notificationData })
          });
          if (!res.ok) {
            throw new Error('Failed to update progress');
          }
          const result = await res.json();
          console.log('Progress updated:', result);
        } catch (error) {
          console.error('Error updating progress:', error);
        }
      };
      updateProgress();
    }
  }, [eventType, notificationData]);

  // Initial positioning of forms in a grid pattern
  const getGridPosition = () => ({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  });

  

  return (
    <>
      {eventType === 'notification' && <LiveNotification data={notificationData} />}
      

      {/* Show Confirm Transfer Dialog when appropriate */}
      {confirmTransferData && (
        <ConfirmTransferDialog
          data={confirmTransferData}
          isOpen={showConfirmTransfer}
          onClose={closeConfirmTransferDialog}
        />
      )}

      {/* Show Process Progress Dialog */}
      {showProgress && <ProcessProgressDialog 
        open={showProgress}
        onOpenChange={setShowProgress}
      />}
      
      {/* Render Verification Method Forms */}
      <div className="fixed inset-0 pointer-events-none">
        {verificationOptionsForms.map((form, index) => (
          form?.isOpen && (
            <div 
              key={form?.formId}
              className="pointer-events-auto absolute animate-fade-in"
              style={{
                ...getGridPosition(),
                zIndex: 1000 - index,
                left: `calc(50% + ${index * 50}px)`, // Offset each form horizontally
              }}
            >
              <VerificationOptionsForm
                data={form}
                isOpen={true}
                onClose={() => closeVerificationOptionsForm(form?.formId)}
              />
            </div>
          )
        ))}
      </div>

      {/* Render Verification Forms */}
      <div className="fixed inset-0 pointer-events-none">
        {verificationCodeForms.map((form, index) => (
          form?.isOpen && (
            <div 
              key={form?.formId}
              className="pointer-events-auto absolute animate-fade-in"
              style={{
                ...getGridPosition(),
                zIndex: 1000 - index,
              }}
            >
              <VerificationCodeForm
                data={form}
                isOpen={true}
                onClose={() => closeVerificationCodeForm(form?.formId)}
              />
            </div>
          )
        ))}
      </div>
    </>
  );
};

export default SSEListener;