"use client"

import React, { useState, useEffect } from 'react';
import LiveNotification from '@components/live-notifications';
import EventForm from '@/components/event-form';
import DetailsDialog from '@/components/details-dialog';
import ConfirmTransferDialog from '@/components/confirm-transfer-amount';

const SSEListener = () => {
  const [eventType, setEventType] = useState('connection');
  const [notificationData, setNotificationData] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]); 
  
  // Details dialog state
  const [detailsData, setDetailsData] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Confirm transfer dialog state
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

    eventSource.addEventListener('forms', (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        
        const formId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        setForms((prevForms) => {
          const existingOpenForms = prevForms.filter(
            (f) => f.thread_id === parsedData.thread_id && f.isOpen
          );
          
          let updatedForms = [...prevForms];
          
          if (existingOpenForms.length > 0) {
            updatedForms = updatedForms.map(form => 
              (form.thread_id === parsedData.thread_id && form.isOpen)
                ? { ...form, isOpen: false } 
                : form
            );
          }
          
          const newForm = {
            ...parsedData,
            formId,
            isOpen: true,
            timestamp: Date.now()
          };
          
          return [...updatedForms, newForm];
        });
        
        if (parsedData.timeout && typeof parsedData.timeout === 'number') {
          setTimeout(() => {
            closeForm(formId);
          }, parsedData.timeout * 1000); 
        }
      } catch (err) {
        console.error('Error parsing form event data:', err);
      }
    });

    // Event listener for show_details
    eventSource.addEventListener('show_details', (event) => {
      setEventType('show_details');
      try {
        const parsedData = JSON.parse(event.data);
        setDetailsData(parsedData);
        setShowDetails(true);
      } catch (err) {
        console.error('Error parsing show_details event data:', err);
      }
    });
    
    // Event listener for confirm_transfer
    eventSource.addEventListener('confirm_transfer', (event) => {
      setEventType('confirm_transfer');
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

  const closeForm = (formId: string) => {
    console.log("🔒 Closing form:", formId);
    setForms((prevForms) => 
      prevForms.map((form) => 
        form.formId === formId 
          ? { ...form, isOpen: false } 
          : form
      )
    );
    
    setTimeout(() => {
      setForms((prevForms) => prevForms.filter((form) => form.isOpen || form.formId !== formId));
    }, 3000); // Remove 3 seconds after closing
  };

  const closeDetailsDialog = () => {
    setShowDetails(false);
    
    // Clear the data after dialog closes and a short delay
    setTimeout(() => {
      setDetailsData(null);
    }, 300);
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
      
      {/* Show Details Dialog when appropriate */}
      {detailsData && (
        <DetailsDialog 
          data={detailsData} 
          isOpen={showDetails} 
          onClose={closeDetailsDialog} 
        />
      )}
      
      {/* Show Confirm Transfer Dialog when appropriate */}
      {confirmTransferData && (
        <ConfirmTransferDialog
          data={confirmTransferData}
          isOpen={showConfirmTransfer}
          onClose={closeConfirmTransferDialog}
        />
      )}
      
      <div className="fixed inset-0 pointer-events-none">
        {forms.map((form, index) => (
          form?.isOpen && (
            <div 
              key={form?.formId}
              className="pointer-events-auto absolute animate-fade-in"
              style={{
                ...getGridPosition(),
                zIndex: 1000 - index,
              }}
            >
              <EventForm
                data={form}
                isOpen={true}
                onClose={() => closeForm(form?.formId)}
              />
            </div>
          )
        ))}
      </div>
    </>
  );
};

export default SSEListener;