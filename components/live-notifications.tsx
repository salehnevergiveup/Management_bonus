import React, { useEffect } from 'react';import { toast } from 'react-toastify';
import { NotificationType } from "@constants/notifications";

const LiveNotification = ({ data }: {data: any}) => {
  useEffect(() => {
    if (data && data.message) {
       
            const res =  fetch(`/api/notifications/${data.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'READ' }),
            }).then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to update notification');
                  }
                  res.json()
            }).catch((error) =>  console.error('Error updating notification:', error)); 

           switch(data.type) { 
            case NotificationType.INFO: 
               toast.info(data.message);
               break;  
               case NotificationType.SUCCESS: 
               toast.success(data.message);
               break;  
               case NotificationType.WARNING: 
               toast.warning(data.message);
               break;  
               case NotificationType.ERROR: 
               toast.error(data.message);
               break;     
           }
    }
  }, [data]);

  return null;
};

export default LiveNotification;

