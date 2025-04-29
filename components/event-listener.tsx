"use client"

import React, { useState, useEffect } from 'react';
import LiveNotification from '@components/live-notifications';
import VerificationOptionsForm from '@/components/verification-options-form';
import VerificationCodeForm from '@/components/verification-code-form';
import ConfirmTransferDialog from '@components/confirm-dialog';
import { Events, FormType } from '@constants/enums';

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
  
  const [verificationOptionsForms, setVerificationOptionsForms] = useState<BaseFormData[]>([]);
  const [verificationCodeForms, setVerificationCodeForms] = useState<BaseFormData[]>([]);
 
  const [confirmTransferData, setConfirmTransferData] = useState<any>(null);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);


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

    eventSource.addEventListener(Events.VERIFICATION_OPTIONS, (event) => {
      setEventType(Events.VERIFICATION_OPTIONS);
      try {
        const parsedData = JSON.parse(event.data);
        const formId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const newForm: BaseFormData = {
          ...parsedData,
          formId,
          isOpen: true,
          timestamp: Date.now(),
          type: FormType.verification_method
        };
        
        setVerificationOptionsForms(prev => 
          prev.map(form => ({ ...form, isOpen: false }))
        );
        
        setTimeout(() => {
          setVerificationOptionsForms(prev => [...prev, newForm]);
        }, 300);
        
        if (parsedData.timeout && typeof parsedData.timeout === 'number') {
          setTimeout(() => {
            closeVerificationOptionsForm(formId);
          }, parsedData.timeout * 1000);
        }
      } catch (err) {
        console.error('Error parsing verification option event data:', err);
      }
    });

    eventSource.addEventListener(Events.VERIFICATION_CODE, (event) => {
      setEventType(Events.VERIFICATION_CODE);
      try {
        const parsedData = JSON.parse(event.data);
        const formId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const newForm: BaseFormData = {
          ...parsedData,
          formId,
          isOpen: true,
          timestamp: Date.now(),
          type: FormType.verification
        };
        
        setVerificationCodeForms(prev => 
          prev.map(form => ({ ...form, isOpen: false }))
        );
        
        setTimeout(() => {
          setVerificationCodeForms(prev => [...prev, newForm]);
        }, 300);
        
        if (parsedData.timeout && typeof parsedData.timeout === 'number') {
          setTimeout(() => {
            closeVerificationCodeForm(formId);
          }, parsedData.timeout * 1000);
        }
      } catch (err) {
        console.error('Error parsing verification code event data:', err);
      }
    });

    eventSource.addEventListener(Events.CONFIRMATION_DIALOG, (event) => {
      console.log("event is triggered ====================================")

      setEventType(Events.CONFIRMATION_DIALOG);
      try {
        const parsedData = JSON.parse(event.data);
        
        setShowConfirmTransfer(false);
        
        setTimeout(() => {
          setConfirmTransferData(parsedData);
          setShowConfirmTransfer(true);
        }, 300);
        
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

  const closeVerificationOptionsForm = (formId: string) => {
    setVerificationOptionsForms((prevForms) => 
      prevForms.map((form) => 
        form.formId === formId 
          ? { ...form, isOpen: false } 
          : form
      )
    );
    
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
    
    setTimeout(() => {
      setVerificationCodeForms((prevForms) => 
        prevForms.filter((form) => form.isOpen || form.formId !== formId)
      );
    }, 3000);
  };

  const closeConfirmTransferDialog = () => {
    setShowConfirmTransfer(false);
    
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

  const centerPosition = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };

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

      {/* Render Verification Method Forms - only show the most recent open one */}
      <div className="fixed inset-0 pointer-events-none">
        {verificationOptionsForms.map((form) => (
          form?.isOpen && (
            <div 
              key={form?.formId}
              className="pointer-events-auto absolute animate-fade-in"
              style={{
                ...centerPosition,
                zIndex: 1000,
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

      {/* Render Verification Forms - only show the most recent open one */}
      <div className="fixed inset-0 pointer-events-none">
        {verificationCodeForms.map((form) => (
          form?.isOpen && (
            <div 
              key={form?.formId}
              className="pointer-events-auto absolute animate-fade-in"
              style={{
                ...centerPosition,
                zIndex: 1000,
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