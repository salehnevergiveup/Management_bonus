"use client"

import { useState, type ChangeEvent, type FormEvent, useEffect } from "react"
import { AppColor } from "@/constants/enums"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/badge"
import DraggableCard from "./ui/draggable-card"
import Timer from "./ui/timer"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

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
  const { lang } = useLanguage()
  const [code, setCode] = useState("")

  // Runtime validation
  useEffect(() => {
    if (!data.data.message) {
      console.warn(t("verification_code_form_warning", lang))
    }
  }, [data, lang])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      // Structure the payload according to what the API expects
      const payload = {
        code,
        thread_id: data.threadId ?? data.data.thread_id,
        process_id: data.processId ?? data.process_id,
        id: data.id ?? data.data.id,
      }

      const res = await fetch(`api/external-app/submit-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(t("failed_submit_verification_code", lang))
      }

      const result = await res.json()
      onClose()
    } catch (error) {
      console.error(t("error_submitting_verification_code", lang), error)
    }
  }

  const handleCancel = async () => {
    try {
      // Structure the payload according to what the API expects
      const payload = {
        code: "000000",
        thread_id: data.threadId ?? data.data.thread_id,
        process_id: data.processId ?? data.process_id,
        id: data.id ?? data.data.id,
      }

      const res = await fetch(`api/external-app/submit-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(t("failed_submit_verification_code", lang))
      }

      const result = await res.json()
      onClose()
    } catch (error) {
      console.error(t("error_submitting_verification_code", lang), error)
    }
  }

  const handleTimeout = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <DraggableCard
      title={t("enter_verification_code", lang)}
      badge={<Badge color={AppColor.SUCCESS} text={data.threadId ?? data.data.thread_id} />}
      timer={data.data.timeout && <Timer seconds={data.data.timeout} onTimeout={handleTimeout} />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {data.data.message && <div className="mb-4 text-sm text-gray-600">{data.data.message}</div>}

        <div className="space-y-2">
          <Label htmlFor="code">{t("verification_code", lang)}</Label>
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
            {t("cancel", lang)}
          </Button>
          <Button type="submit">{t("submit_code", lang)}</Button>
        </div>
      </form>
    </DraggableCard>
  )
}

export default VerificationCodeForm
