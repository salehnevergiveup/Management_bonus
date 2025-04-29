"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { AppColor } from "@/constants/enums"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/badge"
import DraggableCard from "./ui/draggable-card"
import Timer from "./ui/timer"

// Define payload type for API request
interface VerificationMethodPayload {
  verification_method: string;
  thread_id: string;
}

// Define the data structure we expect, making options optional in the type
// but validating its presence in the component
interface VerificationMethodFormProps {
  data: {
    formId: string;
    thread_id: string;
    processId: string;
    type: string;
    isOpen: boolean;
    timestamp: number;
    timeout?: number;
    message?: string;
    title?: string;
    options?: string[] | string;
    [key: string]: any;
  };
  isOpen: boolean;
  onClose: () => void;
}

const VerificationOptionsForm = ({ data, isOpen, onClose }: VerificationMethodFormProps) => {
  const [verificationMethod, setVerificationMethod] = useState("")
  console.log(data);  
  console.log(data.data)
  // Validate required properties at runtime
  useEffect(() => {
    if (!data.data.options) {
      console.error("Verification options form is missing required 'options' property", data);
    }
  }, [data]);

  const parseOptions = (optionsData: string[] | string | undefined): string[] => {
    if (!optionsData) return []
    if (Array.isArray(optionsData)) return optionsData
    if (typeof optionsData === "string") {
      return optionsData
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean)
    }
    return []
  }

  const options = parseOptions(data.data.options)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const thread_id = data.threadId ?? data.data.thread_id;  
    const payload: VerificationMethodPayload = {
      verification_method: verificationMethod, 
      thread_id
    }

    try {
      const res = await fetch("api/external-app/submit-verification-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        throw new Error("Failed to submit verification method")
      }
      const result = await res.json()
      console.log("Verification method submitted successfully:", result)
      onClose()
    } catch (error) {
      console.error("Error submitting verification method:", error)
    }
  }

  const handleTimeout = () => {
    console.log("Verification method form timed out for thread:", data.threadId ?? data.data.thread_id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <DraggableCard
      title="Select Verification Method"
      badge={<Badge color={AppColor.SUCCESS} text={data.threadId ?? data.data.thread_id} />}
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
          <Label htmlFor="verificationMethod">Verification Method</Label>
          <Select value={verificationMethod} onValueChange={setVerificationMethod} required>
            <SelectTrigger id="verificationMethod">
              <SelectValue placeholder="Select a method" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!verificationMethod}>Submit</Button>
        </div>
      </form>
    </DraggableCard>
  );
}

export default VerificationOptionsForm