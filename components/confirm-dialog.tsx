"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/badge"
import DraggableCard from "./ui/draggable-card"
import { AppColor } from "@/constants/enums"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"


// Timer component integrated within this file
const Timer = ({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(seconds)
  const { lang } = useLanguage()

  useEffect(() => {

    if (timeLeft <= 0) {
      onTimeout()
      return
    }

    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timerId)
  }, [timeLeft, onTimeout])

  const minutes = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className={`text-sm font-medium ${timeLeft < 30 ? "text-red-500" : ""}`}>
      {t("time_remaining", lang)}: {minutes}:{secs.toString().padStart(2, "0")}
    </div>
  )
}

// Simple Info Dialog component
const InfoDialog = ({ message, isOpen, onClose }: { message: string; isOpen: boolean; onClose: () => void }) => {
  const { lang } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t("message_details", lang)}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="whitespace-pre-line text-gray-700">{message}</div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>{t("close", lang)}</Button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  data: {
    id: string
    formId?: string
    thread_id?: string
    processId?: string
    threadId?: string
    data?: any
    isOpen?: boolean
    timestamp?: number
    type?: string
    timeout?: number
    message?: string
    title?: string
    [key: string]: any
  }
  isOpen: boolean
  onClose: () => void
  endpoint?: string
}

const ConfirmTransferDialog = ({
  data,
  isOpen,
  onClose,
  endpoint = "/api/external-app/submit-confirmation",
}: ConfirmDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const { lang, setLang } = useLanguage()

  // Handle both data formats - direct props and nested data
  const threadId = data.threadId || data.data?.thread_id
  const processId = data.processId || data.process_id || data.data?.process_id
  const id = data.id || data.data?.id
  // Handle nested data format or direct format with better logging
  const fullMessage = data.data?.message || data.message || ""

  // Get first 10 words for preview
  const getMessagePreview = (message: string) => {
    if (!message) return ""
    const words = message.split(/\s+/)
    const firstTenWords = words.slice(0, 10).join(" ")
    return words.length > 10 ? `${firstTenWords}...` : firstTenWords
  }

  const messagePreview = getMessagePreview(fullMessage)

  // Since timeout is already in seconds, don't divide by 1000
  let timeout = null

  if (data.data?.timeout !== undefined) {
    // Use directly without dividing by 1000
    timeout = Number(data.data.timeout)
  } else if (data.timeout !== undefined) {
    // Use directly without dividing by 1000
    timeout = Number(data.timeout)
  }

  // If no timeout specified or invalid (0 or NaN), use a default
  if (!timeout || isNaN(timeout) || timeout <= 0) {
    timeout = 120 // Default 2 minutes
  }

  const title = data.data?.title || data.title || t("confirm_action", lang)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          confirmation: true,
          thread_id: threadId,
          processId: processId,
        }),
      })

      if (!response.ok) {
        throw new Error(t("failed_submit_confirmation", lang))
      }

      onClose()
    } catch (error) {
      console.error(t("error_submitting_confirmation", lang), error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          confirmation: false,
          thread_id: threadId,
          processId: processId,
        }),
      })

      if (!response.ok) {
        throw new Error(t("failed_submit_rejection", lang))
      }

      onClose()
    } catch (error) {
      console.error(t("error_submitting_rejection", lang), error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTimeout = () => {
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
        <DraggableCard
          title={title}
          badge={<Badge color={AppColor.SUCCESS} text={threadId || t("unknown", lang)} />}
          timer={<Timer seconds={timeout} onTimeout={handleTimeout} />}
          onClose={onClose}
        >
          <div className="space-y-4">
            {fullMessage && (
              <div className="mb-4 text-sm text-gray-600 flex items-start">
                <div className="flex-grow">{messagePreview}</div>
                {fullMessage.length > messagePreview.length && (
                  <button
                    className="ml-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 flex-shrink-0"
                    onClick={() => setShowInfoDialog(true)}
                    title={t("view_full_message", lang)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleReject} disabled={isSubmitting}>
                {t("no", lang)}
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
                {t("yes", lang)}
              </Button>
            </div>
          </div>
        </DraggableCard>
      </div>

      {/* Info Dialog for showing the full message */}
      <InfoDialog message={fullMessage} isOpen={showInfoDialog} onClose={() => setShowInfoDialog(false)} />
    </>
  )
}

export default ConfirmTransferDialog
