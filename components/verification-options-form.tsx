"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { AppColor } from "@/constants/enums"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/badge"
import DraggableCard from "./ui/draggable-card"
import Timer from "./ui/timer"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

// Define payload type for API request
interface VerificationMethodPayload {
  id: string; 
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
  const { lang } = useLanguage()
 
  // Validate required properties at runtime
  useEffect(() => {
    if (!data.data.options) {
      console.error(t("verification_options_missing", lang), data)
    }
  }, [data, lang])

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
    const thread_id = data.threadId ?? data.data.thread_id
    const id = data.id ?? data.data.id
    const payload: VerificationMethodPayload = {
      id,
      verification_method: verificationMethod,
      thread_id,
    }

    try {
      const res = await fetch("api/external-app/submit-verification-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(t("failed_submit_verification_method", lang))
      }
      const result = await res.json()

      onClose()
    } catch (error) {
      console.error(t("error_submitting_verification_method", lang), error)
    }
  }

  const handleCancel = async () => {
    const thread_id = data.threadId ?? data.data.thread_id
    const id = data.id ?? data.data.id
    const payload: VerificationMethodPayload = {
      id,
      verification_method: "None",
      thread_id,
    }

    try {
      const res = await fetch("api/external-app/submit-verification-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(t("failed_submit_verification_method", lang))
      }
      const result = await res.json()
      onClose()
    } catch (error) {
      console.error(t("error_submitting_verification_method", lang), error)
    }
  }

  const handleTimeout = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <DraggableCard
      title={t("select_verification_method", lang)}
      badge={<Badge color={AppColor.SUCCESS} text={data.threadId ?? data.data.thread_id} />}
      timer={data.data.timeout && <Timer seconds={data.data.timeout} onTimeout={handleTimeout} />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {data.data.message && <div className="mb-4 text-sm text-gray-600">{data.data.message}</div>}

        <div className="space-y-2">
          <Label htmlFor="verificationMethod">{t("verification_method", lang)}</Label>
          <Select value={verificationMethod} onValueChange={setVerificationMethod} required>
            <SelectTrigger id="verificationMethod">
              <SelectValue placeholder={t("select_a_method", lang)} />
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
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t("cancel", lang)}
          </Button>
          <Button type="submit" disabled={!verificationMethod}>
            {t("submit", lang)}
          </Button>
        </div>
      </form>
    </DraggableCard>
  )
}

export default VerificationOptionsForm
