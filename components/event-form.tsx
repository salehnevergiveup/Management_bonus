"use client"

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react"
import { AppColor, FormType } from "@/constants/enums"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/badge"

interface VerificationMethodPayload {
  verification_method: string
  thread_id: string
}

interface EventFormProps {
  data: any
  isOpen: boolean
  onClose: () => void
}

const DraggableCard = ({ children, title, badge, timer, onClose }: any) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseDown = (e: any) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={cardRef}
      className="bg-white rounded-lg shadow-lg border border-gray-200 w-96 max-w-full"
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 100 : 100
      }}
    >
      <div 
        className="p-4 border-b drag-handle flex justify-between items-center" 
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="ml-2">{badge}</div>
        <button
          className="ml-2 text-white hover:text-gray-200"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {timer && (
        <div className="px-4 py-2 border-b bg-gray-50">
          {timer}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

// Timer component to show countdown
const Timer = ({ seconds, onTimeout }: { seconds: number, onTimeout: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    
    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [timeLeft, onTimeout]);
  
  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  
  return (
    <div className={`text-sm font-medium ${timeLeft < 30 ? 'text-red-500' : ''}`}>
      Time remaining: {minutes}:{secs.toString().padStart(2, '0')}
    </div>
  );
};

const VerificationMethodForm = ({ data, onClose }: { data: any; onClose: () => void }) => {
  const [verificationMethod, setVerificationMethod] = useState("")

  const parseOptions = (optionsData: any): string[] => {
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

  const options = parseOptions(data.options)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const thread_id = data.thread_id;  
    const payload: VerificationMethodPayload = {verification_method: verificationMethod, thread_id }

    try {
      const res = await fetch("api/external-app/submit-verification-method", {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
  )
}

const VerificationForm = ({ data, onClose }: { data: any; onClose: () => void }) => {
  const [code, setCode] = useState("")
  console.log("Form data received:", data);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const thread_id = data.thread_id
    try {
      const res = await fetch("api/external-app/submit-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code, 
          thread_id,
          process_id: data.processId 
        }),
      })
      if (!res.ok) {
        throw new Error("Failed to submit verification code")
      }
      const result = await res.json()
      console.log("Verification code submitted successfully:", result)
      onClose()
    } catch (error) {
      console.error("Error submitting verification code:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Display title and message if available */}

      {data.title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{data.title}</h3>
        </div>
      )}
      {data.message && (
        <div className="mb-4 text-sm text-gray-600">
          {data.message}
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
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Submit Code</Button>
      </div>
    </form>
  )
}

const EventForm = ({ data, isOpen, onClose }: EventFormProps) => {
  const handleTimeout = () => {
    console.log("Form timed out for thread:", data.thread_id);
    onClose();
  };
  
  const getFormTitle = () => {
    if (data.type === FormType.verification_method) {
      return "Select Verification Method"
    } else if (data.type === FormType.verification) {
      return data.label || "Enter Verification Code"
    }
    return "Form"
  }

  const renderForm = () => {
    if (data.type === FormType.verification_method) {
      return <VerificationMethodForm data={data} onClose={onClose} />
    } else if (data.type === FormType.verification) {
      return <VerificationForm data={data} onClose={onClose} />
    }
    return <div>Invalid form type</div>
  }

  if (!isOpen) return null;

  return (
    <DraggableCard
      title={getFormTitle()}
      badge={<Badge color={AppColor.SUCCESS} text={data.thread_id} />}
      timer={data.timeout && <Timer seconds={data.timeout} onTimeout={handleTimeout} />}
      onClose={onClose}
    >
      {renderForm()}
    </DraggableCard>
  );
}

export default EventForm