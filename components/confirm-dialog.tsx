"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/badge"
import DraggableCard from "./ui/draggable-card"
import Timer from "./ui/timer"
import { AppColor } from "@/constants/enums"

interface ConfirmDialogProps {
  data: {
    formId?: string;
    thread_id?: string;
    processId?: string;
    threadId?: string;
    data?: {
      message?: string;
      timeout?: number;
      title?: string;
    };
    isOpen?: boolean;
    timestamp?: number;
    type?: string;
    timeout?: number;
    message?: string;
    title?: string;
    [key: string]: any;
  };
  isOpen: boolean;
  onClose: () => void;
  endpoint?: string;
}

const ConfirmTransferDialog = ({ 
  data, 
  isOpen, 
  onClose,
  endpoint = "/api/confirm-transfer" 
}: ConfirmDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  console.log("ConfirmTransferDialog rendering with data:", data);
  
  // Handle both data formats - direct props and nested data
  const threadId = data.threadId || data.thread_id || "";
  const processId = data.processId || "";
  
  // Handle nested data format or direct format
  const message = data.data?.message || data.message || "";
  const timeout = data.data?.timeout 
    ? Math.floor(data.data.timeout / 1000) 
    : (data.timeout ? Math.floor(data.timeout / 1000) : null);
  const title = data.data?.title || data.title || "Confirm Action";

  const handleConfirm = async () => {
    console.log("Confirm button clicked");
    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: true,
          thread_id: threadId,
          processId: processId
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit confirmation")
      }

      onClose()
    } catch (error) {
      console.error("Error submitting confirmation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    console.log("Reject button clicked");
    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: false,
          thread_id: threadId,
          processId: processId
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit rejection")
      }

      onClose()
    } catch (error) {
      console.error("Error submitting rejection:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTimeout = () => {
    console.log("Confirmation dialog timed out for thread:", threadId);
    onClose();
  };

  if (!isOpen) {
    console.log("Dialog not open, returning null");
    return null;
  }

  console.log("Rendering dialog with title:", title, "message:", message);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <DraggableCard
        title={title}
        badge={<Badge color={AppColor.SUCCESS} text={threadId || "Unknown"} />}
        timer={timeout && <Timer seconds={timeout} onTimeout={handleTimeout} />}
        onClose={onClose}
      >
        <div className="space-y-4">
          {message && (
            <div className="mb-4 text-sm text-gray-600">
              {message}
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReject}
              disabled={isSubmitting}
            >
              No
            </Button>
            <Button 
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              Yes
            </Button>
          </div>
        </div>
      </DraggableCard>
    </div>
  );
}

export default ConfirmTransferDialog