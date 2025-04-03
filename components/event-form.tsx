"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { FormType } from "@/constants/enums"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface VerificationMethodPayload {
  verificationMethod: string
  thread_id: string
}

interface EventFormProps {
  data: any
  isOpen: boolean
  onClose: () => void
}

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
    const thread_id  = data.thread_id;  
    const payload: VerificationMethodPayload = { verificationMethod, thread_id }

    try {
      const res = await fetch("/api/external/out/submit-verification-method", {
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const thread_id = data.thread_id
    try {
      const res = await fetch("/api/external/out/submit-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, thread_id }),
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getFormTitle()}</DialogTitle>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  )
}

export default EventForm