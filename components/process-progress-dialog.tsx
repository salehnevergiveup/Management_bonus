"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

export type ProcessProgressItem = {
  id: string
  process_id: string
  process_stage: string
  thread_stage: string | null
  thread_id: string | null
  data: {
    message?: string
  } | null
  event_name: string
  status: string
  created_at: string | null
}

interface ProcessProgressDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function SimplifiedProcessProgress({
  trigger,
  open: externalOpen,
  onOpenChange,
}: ProcessProgressDialogProps) {
  const { lang } = useLanguage()
  // States
  const [internalOpen, setInternalOpen] = useState(false)
  const [progressData, setProgressData] = useState<ProcessProgressItem[]>([])
  const [loading, setLoading] = useState(false)

  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  useEffect(() => {
    if (open) {
      fetchProgressData()
      // Set up polling if needed
      const interval = setInterval(() => {
        fetchProgressData()
      }, 30000) // Poll every 30 seconds

      return () => clearInterval(interval)
    }
  }, [open])

  const fetchProgressData = async () => {
    setLoading(true)

    try {
      const res = await fetch("/api/process-progress")

      if (!res.ok) {
        toast.error(`${t("error_fetching_progress_data", lang)}: ${res.status}`)
        setLoading(false)
        return
      }

      const data = await res.json()
      setProgressData(data)
      setLoading(false)
    } catch (error) {
      console.error(t("error_fetching_progress_data", lang), error)
      toast.error(t("failed_fetch_progress_data", lang))
      setLoading(false)
      setProgressData([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen!}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Clock className="h-4 w-4" /> {t("view_progress", lang)}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{t("process_progress_tracker", lang)}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen?.(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)] p-6">
          {loading && progressData.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : progressData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t("no_progress_data_found", lang)}</div>
          ) : (
            <div className="space-y-4">
              {progressData.map((item) => (
                <ProgressItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function ProgressItemCard({ item }: { item: ProcessProgressItem }) {
  // Formatting helpers
  const formatStatus = (status: string) => {
    return status === "success" ? "Success" : "Failed"
  }
  const { lang, setLang } = useLanguage()

  const formatName = (name: string) => {
    if (!name) return "Unknown"
    
    return name
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, char => char.toUpperCase())
  }

  return (
    <Card className="p-4 border">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {item.status === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <h3 className="font-medium">
              {t("event", lang)}: {formatName(item.process_stage)}
            </h3>
          </div>
          <Badge variant={item.status === "success" ? "success" : "destructive"} className="text-black">
            {formatStatus(item.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
          {item.thread_id && (
            <div className="text-sm">
              <p className="text-muted-foreground">{t("account_name", lang)}:</p>
              <p className="font-mono text-xs">{item.thread_id}</p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground">{t("created_at", lang)}:</p>
            <p>{item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {item.thread_stage && (
            <div>
              <p className="text-muted-foreground">{t("process_sub_stage", lang)}:</p>
              <p>{formatName(item.thread_stage)}</p>
            </div>
          )}
        </div>

        {item.data?.message && (
          <div className="mt-2 p-3 bg-muted/20 rounded-md text-sm">
            <p className="text-muted-foreground mb-1">{t("message", lang)}:</p>
            <p>{item.data.message}</p>
          </div>
        )}
      </div>
    </Card>
  )
}