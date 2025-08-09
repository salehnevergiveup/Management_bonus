import { useState, useEffect, useCallback } from 'react';

interface UseFormSyncOptions {
  formId: string;
  syncInterval?: number; // in milliseconds, default 30 seconds
  onFormExpired?: (formId: string) => void;
}

export const useFormSync = ({ 
  formId, 
  syncInterval = 30000, // 30 seconds
  onFormExpired 
}: UseFormSyncOptions) => {
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const syncForm = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/process-progress/forms');
      if (response.ok) {
        const data = await response.json();
        const form = data.forms?.find((f: any) => f.id === formId);
        
        if (!form) {
          // Form no longer exists or has been removed
          console.log(`Form ${formId} no longer exists, triggering expiration`);
          onFormExpired?.(formId);
          return;
        }
        
        if (form.data?.is_active === false) {
          // Form has been marked as inactive
          console.log(`Form ${formId} has been marked as inactive`);
          onFormExpired?.(formId);
          return;
        }
        
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Error syncing form:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [formId, isSyncing, onFormExpired]);

  useEffect(() => {
    // Initial sync
    syncForm();
    
    // Set up periodic sync
    const intervalId = setInterval(syncForm, syncInterval);
    
    return () => clearInterval(intervalId);
  }, [syncForm, syncInterval]);

  return {
    lastSync,
    isSyncing,
    syncForm
  };
}; 