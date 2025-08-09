"use client"

import React, { useEffect, useState } from 'react';
import VerificationOptionsForm from '@/components/verification-options-form';
import VerificationCodeForm from '@/components/verification-code-form';
import ConfirmTransferDialog from '@components/confirm-dialog';
import { Events, FormType } from '@constants/enums';

type BaseFormData = {
  id: string;
  formId: string;
  thread_id: string;
  threadId?: string; // For real-time compatibility
  processId: string;
  isOpen: boolean;
  timestamp: number;
  type: string;
  timeout?: number;
  data?: any; // For database forms
  [key: string]: any; 
};

const FormLoader = () => {
  const [verificationOptionsForms, setVerificationOptionsForms] = useState<BaseFormData[]>([]);
  const [verificationCodeForms, setVerificationCodeForms] = useState<BaseFormData[]>([]);
  const [confirmTransferDialogs, setConfirmTransferDialogs] = useState<BaseFormData[]>([]);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch('/api/process-progress/forms');
        if (!response.ok) {
          throw new Error('Failed to fetch forms');
        }
        
        const formResponse = await response.json();
        const forms = formResponse.forms; 
        // Sort forms by type
        const verificationOptions: BaseFormData[] = [];
        const verificationCodes: BaseFormData[] = [];
        const confirmTransfers: BaseFormData[] = [];
        
        forms.forEach((form: any) => {
          // Add formId and isOpen properties
          const formWithId: BaseFormData = {
            ...form,
            formId: `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            isOpen: true,
            timestamp: Date.now(),
            // Map thread_id to the expected structure
            threadId: form.thread_id, // For real-time compatibility
            data: {
              ...form.data,
              thread_id: form.thread_id // Ensure thread_id is in data as well
            }
          };

          // Debug logging for timeout forms
          if (form.data?.timeout && form.data.timeout > 0) {
            // Timeout form loaded successfully
          }

          
          if (form.event_name === Events.VERIFICATION_OPTIONS) {
            verificationOptions.push(formWithId);
          } else if (form.event_name === Events.VERIFICATION_CODE) {
            verificationCodes.push(formWithId);
          } else if (form.event_name === Events.CONFIRMATION_DIALOG) {
            confirmTransfers.push(formWithId);
          }
        });
        
        setVerificationOptionsForms(verificationOptions);
        setVerificationCodeForms(verificationCodes);
        setConfirmTransferDialogs(confirmTransfers);
      } catch (error) {
        console.error('Error fetching forms:', error);
      }
    };
    
    fetchForms();
  }, []);
  
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

  const closeConfirmTransferDialog = (formId: string) => {
    setConfirmTransferDialogs((prevDialogs) => 
      prevDialogs.map((dialog) => 
        dialog.formId === formId 
          ? { ...dialog, isOpen: false } 
          : dialog
      )
    );
    
    // Clean up after animation
    setTimeout(() => {
      setConfirmTransferDialogs((prevDialogs) => 
        prevDialogs.filter((dialog) => dialog.isOpen || dialog.formId !== formId)
      );
    }, 300);
  };

  // Initial positioning of forms in a grid pattern
  const getGridPosition = () => ({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  });

  return (
    <>
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

      {/* Render Confirm Transfer Dialogs */}
      {confirmTransferDialogs.map((dialog) => (
        dialog?.isOpen && (
          <ConfirmTransferDialog
            key={dialog?.formId}
            data={dialog}
            isOpen={true}
            onClose={() => closeConfirmTransferDialog(dialog?.formId)}
          />
        )
      ))}
    </>
  );
};

export default FormLoader;