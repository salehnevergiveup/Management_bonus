"use client"

import { useState, type ChangeEvent, type FormEvent, useEffect } from "react"
import { AppColor } from "@/constants/enums"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/badge"
import DraggableCard from "./ui/draggable-card"
import Timer from "./ui/timer"

interface VerificationFormProps {
  data: {
    id: string; 
    formId: string;
    thread_id: string;
    processId: string;
    type: string;
    isOpen: boolean;
    timestamp: number;
    timeout?: number;
    message?: string;
    title?: string;
    label?: string;
    [key: string]: any;
  };
  isOpen: boolean;
  onClose: () => void;
}

const VerificationCodeForm = ({ data, isOpen, onClose }: VerificationFormProps) => {

  const [code, setCode] = useState("")
  // Runtime validation
  useEffect(() => {
    if (!data.data.message) {
      console.warn("Verification code form should have a 'message' property");
    }
  }, [data]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      // Structure the payload according to what the API expects
      const payload = { 
        code, 
        thread_id: data.threadId ?? data.data.thread_id,
        process_id: data.processId ?? data.process_id,  
        id: data.id ?? data.data.id
      };

      const res = await fetch(`api/external-app/submit-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error  = await res.json()
        console.log(error)
        throw new Error("Failed to submit verification code")
      }

      const result = await res.json()
      console.log("Verification code submitted successfully:", result)
      onClose()
    } catch (error) {
      console.error("Error submitting verification code:", error)
    }
  }

  const handleCancel = async () => {
    try {
      // Structure the payload according to what the API expects
      const payload = { 
        code:  "000000", 
        thread_id: data.threadId ?? data.data.thread_id,
        process_id: data.processId ?? data.process_id,  
        id: data.id ?? data.data.id
      };
      
      const res = await fetch(`api/external-app/submit-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error  = await res.json()
        console.log(error)
        throw new Error("Failed to submit verification code")
      }

      const result = await res.json()
      onClose()
    } catch (error) {
      console.error("Error submitting verification code:", error)
    }
  }

  const handleTimeout = () => {
    console.log("Verification form timed out for thread:", data.threadId ?? data.data.thread_id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <DraggableCard
      title="Enter Verification Code"
      badge={<Badge color={AppColor.SUCCESS} text={data.threadId ??data.data.thread_id} />}
      timer={data.data.timeout && <Timer seconds={data.data.timeout} onTimeout={handleTimeout} />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {data.data.message && (
          <div className="mb-4 text-sm text-gray-600">
            {data.data.message}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit">Submit Code</Button>
        </div>
      </form>
    </DraggableCard>
  );
}

export default VerificationCodeForm