"use client"

import React, { useState, useEffect } from 'react';
import LiveNotification from '@components/live-notifications';
import EventForm from '@/components/event-form';

const SSEListener = () => {
  const [eventType, setEventType] = useState('connection');
  const [data, setData] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
        setData(parsedData);
      } catch (err) {
        console.error('Error parsing notification event data:', err);
      }
    });

    eventSource.addEventListener('forms', (event) => {
      setEventType('form');
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
        setIsFormOpen(true); 
      } catch (err) {
        console.error('Error parsing form event data:', err);
      }
    });

    eventSource.addEventListener('progress', (event) => {
      setEventType('progress');
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
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

  useEffect(() => {
    if (eventType === 'progress' && data) {
      const updateProgress = async () => {
        try {
          const res = await fetch('/progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data })
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
  }, [eventType, data]);

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  if (eventType === 'progress') {
    return null;
  }

  return (
    <>
      {eventType === 'notification' && <LiveNotification data={data} />}
      {eventType === 'form' && data && (
        <EventForm 
          data={data} 
          isOpen={isFormOpen} 
          onClose={handleCloseForm} 
        />
      )}
    </>
  );
};

export default SSEListener;